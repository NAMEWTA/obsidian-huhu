package stdio

import "testing"

// Choose both admission/last-write orders with gates. Do not physically Close:
// accepting in the gap after the close decision must already be impossible.
func TestFinalWriterAndAdmissionBarrier(t *testing.T) {
	for _, readerFirst := range []bool{true, false} {
		name := "writer first"
		if readerFirst {
			name = "reader first"
		}
		t.Run(name, func(t *testing.T) {
			s := &Server{stopAck: true}
			if !s.acceptRequest() {
				t.Fatal("first admission")
			}
			allowReader, allowWriter := make(chan struct{}), make(chan struct{})
			reader, writer := make(chan bool, 1), make(chan bool, 1)
			go func() { <-allowReader; reader <- s.acceptRequest() }()
			go func() { <-allowWriter; writer <- s.finishRequest(true, true) }()
			var admitted, closeNow bool
			if readerFirst {
				close(allowReader)
				admitted = <-reader
				close(allowWriter)
				closeNow = <-writer
				if !admitted || closeNow {
					t.Fatal("lost admitted reply")
				}
				if !s.finishRequest(true, false) {
					t.Fatal("last reply did not seal admission")
				}
			} else {
				close(allowWriter)
				closeNow = <-writer
				close(allowReader)
				admitted = <-reader
				if !closeNow || admitted {
					t.Fatal("accepted after last-writer close decision")
				}
			}
			if s.acceptRequest() {
				t.Fatal("accepted in physical close gap")
			}
		})
	}
}
