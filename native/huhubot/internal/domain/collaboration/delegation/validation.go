package delegation

import (
	"strings"
	"unicode/utf8"
)

func Text(s string, max int, required bool) bool {
	return utf8.ValidString(s) && len(s) <= max && (!required || strings.TrimSpace(s) != "")
}

func Task(task, expected string, constraints []string) bool {
	if !Text(task, 65536, true) || !Text(expected, 8192, false) || len(constraints) > 32 {
		return false
	}
	total := len(task) + len(expected)
	for _, c := range constraints {
		if !Text(c, 2048, true) {
			return false
		}
		total += len(c)
	}
	return total <= 128*1024
}
