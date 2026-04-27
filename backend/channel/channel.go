package channel

import (
	"fmt"

	"github.com/pion/webrtc/v3"
)

type Channel interface {
	OnMessage(webrtc.DataChannelMessage)
	OnError(error)
	OnOpen()
	OnClose()
}

type DataChannel struct {
	dc *webrtc.DataChannel
}

func MakeChannel(dc *webrtc.DataChannel, label string) (Channel, error) {
	if label == "lobby" {
		return LobbyChannel{dc: dc}, nil
	}

	if label == "data" {
		return ActionChannel{dc: dc, game: nil}, nil
	}

	return LobbyChannel{dc: dc}, fmt.Errorf("not a channel i know")
}
