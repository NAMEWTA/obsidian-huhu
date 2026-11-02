package credentials

import "encoding/binary"

// parseCRTTable reads the explicitly supported libuv 1.52.1 CRT inheritance
// layout. It does not treat Windows integer fd values as kernel HANDLEs.
func parseCRTTable(p []byte, pointerBytes int) ([2]uint64, error) {
	var result [2]uint64
	if (pointerBytes != 4 && pointerBytes != 8) || len(p) < 4 {
		return result, errProtocol
	}
	n := int(binary.LittleEndian.Uint32(p))
	if n < 5 || n > 255 || 4+n+n*pointerBytes > len(p) {
		return result, errProtocol
	}
	handles := make([]uint64, n)
	for i := range handles {
		offset := 4 + n + i*pointerBytes
		if pointerBytes == 4 {
			handles[i] = uint64(binary.LittleEndian.Uint32(p[offset:]))
		} else {
			handles[i] = binary.LittleEndian.Uint64(p[offset:])
		}
	}
	invalid := ^uint64(0)
	if pointerBytes == 4 {
		invalid = 0xffffffff
	}
	for i := 3; i <= 4; i++ {
		if p[4+i]&9 != 9 || handles[i] == 0 || handles[i] == invalid {
			return result, errProtocol
		}
		for j := 0; j < i; j++ {
			if handles[j] == handles[i] {
				return result, errProtocol
			}
		}
		result[i-3] = handles[i]
	}
	return result, nil
}
