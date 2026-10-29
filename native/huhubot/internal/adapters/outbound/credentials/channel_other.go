//go:build !linux && !darwin && !windows

package credentials

import (
	"errors"
	"io"
)

func OpenManagedChannel() (io.ReadCloser, io.WriteCloser, error) { return nil, nil, errProtocol }
func wouldBlock(err error) bool                                  { return errors.Is(err, errWouldBlock) }
func waitFile(io.Reader) error                                   { return errNotFile }
