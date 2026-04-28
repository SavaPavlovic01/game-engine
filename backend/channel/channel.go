package channel

import (
	globalcontext "cs/globalContext"
	"fmt"
	"strings"

	"github.com/pion/webrtc/v3"
)

type Channel interface {
	OnMessage(webrtc.DataChannelMessage)
	OnError(error)
	OnOpen()
	OnClose()
	SendText(string) error
}

func MakeChannel(dc *webrtc.DataChannel, label string) (Channel, error) {
	labelSplit := strings.SplitN(label, "-", 2)
	channelType := labelSplit[0]
	if channelType == "lobby" {
		return LobbyChannel{dc: dc}, nil
	}

	if channelType == "data" && len(labelSplit) == 2 {
		game, _ := globalcontext.Ctx.GetGame(labelSplit[1])
		return ActionChannel{dc: dc, actionChannel: game.ActionChannel}, nil
	}

	return LobbyChannel{dc: dc}, fmt.Errorf("not a channel i know")
}
