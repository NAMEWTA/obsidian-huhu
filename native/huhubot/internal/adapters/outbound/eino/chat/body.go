package chat

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"strconv"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/adapters/outbound/eino/common"
	"github.com/NAMEWTA/obsidian-huhu/native/huhubot/internal/application/api"
)

// This observer retains protocol facts lost by the fixed SDK's EOF and usage
// conversions. It never emits messages or executes tools; the real SDK parses.
type observedBody struct {
	io.ReadCloser
	cancel          context.CancelFunc
	closed          chan struct{}
	once            sync.Once
	total, event    int
	line            []byte
	done, refusal   bool
	finish, problem string
	input, output   string
	usageKnown      bool
	utf8Tail, ready []byte
	readErr         error
}

func newObservedBody(body io.ReadCloser, cancel context.CancelFunc) *observedBody {
	return &observedBody{ReadCloser: body, cancel: cancel, closed: make(chan struct{})}
}
func (b *observedBody) Read(p []byte) (int, error) {
	if len(p) == 0 {
		return 0, nil
	}
	if b.problem != "" {
		return 0, common.Fault(b.problem)
	}
	for len(b.ready) == 0 && b.readErr == nil {
		var raw [4096]byte
		idleDone := make(chan struct{})
		timer := time.AfterFunc(common.IdleTimeout, func() { b.cancel(); close(idleDone) })
		n, err := b.ReadCloser.Read(raw[:])
		if !timer.Stop() {
			<-idleDone
		}
		b.total += n
		if b.total > common.MaxResponseBytes {
			b.problem = "MODEL_RESPONSE_LIMIT"
		}
		// A Reader may split a rune anywhere. Withhold its incomplete suffix
		// (at most three bytes), and never let SDK JSON replace illegal bytes.
		data := append(b.utf8Tail, raw[:n]...)
		valid := 0
		for valid < len(data) && utf8.FullRune(data[valid:]) {
			r, size := utf8.DecodeRune(data[valid:])
			if r == utf8.RuneError && size == 1 {
				b.problem = "MODEL_STREAM_INVALID"
				b.usageKnown = false
				break
			}
			valid += size
		}
		if err != nil && valid != len(data) {
			b.problem = "MODEL_STREAM_INVALID"
			b.usageKnown = false
		}
		if b.problem != "" {
			b.cancel()
			return 0, common.Fault(b.problem)
		}
		b.ready = append(b.ready[:0], data[:valid]...)
		b.utf8Tail = append([]byte(nil), data[valid:]...)
		for _, v := range b.ready {
			b.line = append(b.line, v)
			if len(b.line) > common.MaxLineBytes {
				b.problem = "MODEL_LINE_LIMIT"
				break
			}
			if v == '\n' {
				b.observeLine(bytes.TrimSpace(b.line))
				b.line = b.line[:0]
			}
		}
		if err != nil {
			// A final line has no newline to trigger the ordinary observer. It
			// has still passed the same raw UTF-8 validation before SDK sees it.
			if len(b.line) > 0 {
				b.observeLine(bytes.TrimSpace(b.line))
				b.line = b.line[:0]
			}
			b.readErr = err
		}
		if b.problem != "" {
			b.cancel()
			return 0, common.Fault(b.problem)
		}
		if n == 0 && err == nil {
			return 0, nil
		}
	}
	n := copy(p, b.ready)
	b.ready = b.ready[n:]
	if len(b.ready) == 0 {
		return n, b.readErr
	}
	return n, nil
}
func (b *observedBody) Close() error {
	err := b.ReadCloser.Close()
	b.once.Do(func() { close(b.closed) })
	return err
}
func (b *observedBody) observeLine(line []byte) {
	if len(line) == 0 {
		b.event = 0
		return
	}
	b.event += len(line)
	if b.event > common.MaxEventBytes {
		b.problem = "MODEL_EVENT_LIMIT"
		return
	}
	if !bytes.HasPrefix(line, []byte("data:")) {
		return
	}
	data := bytes.TrimSpace(line[5:])
	if bytes.Equal(data, []byte("[DONE]")) {
		b.done = true
		return
	}
	var chunk struct {
		Choices []struct {
			Index  int     `json:"index"`
			Finish *string `json:"finish_reason"`
			Delta  struct {
				Refusal string `json:"refusal"`
			} `json:"delta"`
		} `json:"choices"`
		Usage json.RawMessage `json:"usage"`
	}
	if json.Unmarshal(data, &chunk) != nil {
		return
	}
	for _, c := range chunk.Choices {
		if c.Index != 0 {
			b.problem = "MODEL_CHOICE_INVALID"
		}
		if c.Finish != nil && *c.Finish != "" {
			b.finish = *c.Finish
		}
		if c.Delta.Refusal != "" {
			b.refusal = true
		}
	}
	if len(chunk.Usage) > 0 && !bytes.Equal(chunk.Usage, []byte("null")) {
		var usage map[string]json.RawMessage
		if json.Unmarshal(chunk.Usage, &usage) != nil {
			return
		}
		input, ok1 := quantity(json.Number(usage["prompt_tokens"]))
		output, ok2 := quantity(json.Number(usage["completion_tokens"]))
		b.input, b.output = input, output
		b.usageKnown = ok1 && ok2
	}
}
func quantity(n json.Number) (string, bool) {
	if n == "" {
		return "", false
	}
	v, err := strconv.ParseInt(string(n), 10, 64)
	if err != nil || v < 0 {
		return "", false
	}
	return strconv.FormatInt(v, 10), true
}
func (b *observedBody) observation() api.AttemptObservation {
	k := "unknown"
	if b.usageKnown {
		k = "known"
	}
	return api.AttemptObservation{Knowledge: k, InputTokens: b.input, OutputTokens: b.output, ProducerEnded: true}
}
