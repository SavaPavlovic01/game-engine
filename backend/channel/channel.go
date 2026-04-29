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
	labelSplit := strings.SplitN(label, "--", 3)
	fmt.Printf("look here %s\n", labelSplit[0])
	channelType := labelSplit[0]
	if channelType == "lobby" {
		return LobbyChannel{dc: dc}, nil
	}

	if channelType == "data" && len(labelSplit) == 3 {
		game, _ := globalcontext.Ctx.GetGame(labelSplit[1])
		player, _ := globalcontext.Ctx.GetPlayer(labelSplit[2])
		if player == nil {
			fmt.Printf("i didnt find the player")
		} else {
			fmt.Println("found the player broke boy")
		}
		player.ActionChannel = dc

		return ActionChannel{dc: dc, actionChannel: game.ActionChannel}, nil
	}

	return LobbyChannel{dc: dc}, fmt.Errorf("not a channel i know")
}
