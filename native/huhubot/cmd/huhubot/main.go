package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/inbound/stdio"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/credentials"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/bootstrap"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/runtime/profile"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() { os.Exit(run(os.Args[1:])) }
func run(args []string) int {
	// The internal one-shot worker has no Profile, HAP, or alternate service flags.
	if len(args) == 1 && args[0] == "--credential-worker=stdio-v1" {
		ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer cancel()
		worker, workerCancel := context.WithTimeout(ctx, 3*time.Second)
		// Pipe reads and synchronous OS calls may ignore context. This process
		// owns no Profile/DB, so it must also exit when its supervisor has died.
		stop := context.AfterFunc(worker, func() { os.Exit(1) })
		defer func() { stop(); workerCancel() }()
		if credentials.RunWorker(worker, os.Stdin, os.Stdout) != nil {
			return 1
		}
		return 0
	}
	// Logs are fixed vocabulary, never paths, input bytes, prompts or credentials.
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	flags := flag.NewFlagSet("huhubot", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	stdioMode := flags.Bool("stdio", false, "framed stdio mode")
	locator := flags.String("profile", "", "absolute managed Profile locator")
	managed := flags.Bool("managed", false, "managed parent owns lifecycle and Host")
	credentialChannel := flags.String("credential-channel", "", "managed private anonymous pipe protocol")
	if err := flags.Parse(args); err != nil || flags.NArg() != 0 || !*stdioMode || *locator == "" || (*credentialChannel != "" && (*credentialChannel != "stdio-v1" || !*managed)) {
		fmt.Fprintln(os.Stderr, `{"kind":"INVALID_ARGUMENT","reason":"CLI_ARGUMENTS_INVALID"}`)
		return 2
	}
	root, err := profile.DefaultRoot()
	if err != nil {
		logger.Error("startup rejected", "kind", "CAPABILITY_DENIED", "reason", "LOCAL_ROOT_UNAVAILABLE")
		return 1
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	var privateRead io.ReadCloser
	var privateWrite io.WriteCloser
	if *credentialChannel != "" {
		privateRead, privateWrite, err = credentials.OpenManagedChannel()
		if err != nil {
			logger.Error("startup rejected", "kind", "CAPABILITY_DENIED", "reason", "CREDENTIAL_CHANNEL_INVALID")
			return 1
		}
		defer func() { _ = privateRead.Close(); _ = privateWrite.Close() }()
	}
	startup, startCancel := context.WithTimeout(ctx, 10*time.Second)
	core, err := bootstrap.Open(startup, root, *locator)
	startCancel()
	if err != nil {
		kind, reason := "CONFLICT", "PROFILE_OPEN_FAILED"
		var f *api.Fault
		if errors.As(err, &f) {
			kind, reason = f.Kind, f.Reason
		}
		logger.Error("startup rejected", "kind", kind, "reason", reason)
		return 1
	}
	defer func() {
		if e := core.Close(); e != nil {
			logger.Error("shutdown draining", "kind", "RECOVERY_BLOCKED", "reason", "EXECUTOR_STOP_TIMEOUT")
			_ = core.WaitClosed(context.Background())
		}
	}()
	identity := api.NewConnectionIdentity(api.NewID("connection:"), "local-owner", *managed)
	server := stdio.NewOwnerWithPortable(os.Stdin, os.Stdout, core.API, identity, core.API.GlobalMemory, core.Portable)
	var channelDone chan struct{}
	if privateRead != nil {
		s, e := core.API.Service.Status(ctx, identity)
		if e != nil {
			return 1
		}
		channelDone = make(chan struct{})
		go func() {
			defer close(channelDone)
			_ = credentials.ServeChannel(ctx, privateRead, privateWrite, s.Profile.ProfileID, core.Credentials)
			cancel()
		}()
		defer func() { cancel(); _ = privateRead.Close(); _ = privateWrite.Close(); <-channelDone }()
	}
	if err = server.Run(ctx); err != nil {
		logger.Error("transport closed", "kind", "INVALID_ARGUMENT", "reason", "PROTOCOL_REJECTED")
		return 1
	}
	return 0
}
