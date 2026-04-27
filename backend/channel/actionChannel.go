package channel

import (
	"cs/game"

	"github.com/pion/webrtc/v3"
)

type ActionType uint32

const (
	MOVE ActionType = iota
)

type ActionChannel struct {
	dc   *webrtc.DataChannel
	game *game.Game
}

func (ac ActionChannel) SendText(msg string) error {
	return ac.dc.SendText(msg)
}

//func (ac ActionChannel) handleMoveMessage

func (ac ActionChannel) OnMessage(msg webrtc.DataChannelMessage) {
	if ac.game == nil {
		// idk, maybe just ignore for now
		return
	}

}

func (ac ActionChannel) OnError(err error) {

}

func (ac ActionChannel) OnOpen() {

}

func (ac ActionChannel) OnClose() {

}
