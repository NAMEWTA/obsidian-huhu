//go:build !linux && !darwin && !windows

package credentials

import "io"

func OpenManagedChannel() (io.ReadCloser, io.WriteCloser, error) { return nil, nil, errProtocol }
