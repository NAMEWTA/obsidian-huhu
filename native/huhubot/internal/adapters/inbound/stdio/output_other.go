//go:build !linux && !darwin && !windows

package stdio

import "io"

func prepareOutput(output io.WriteCloser) (io.WriteCloser, error) { return output, nil }
