package run

func Terminal(state string) bool {
	return state == "succeeded" || state == "failed" || state == "canceled"
}
func ResultState(result string) (string, bool) {
	switch result {
	case "finished":
		return "succeeded", true
	case "failed":
		return "failed", true
	case "suspended":
		return "blocked", true
	}
	return "", false
}
