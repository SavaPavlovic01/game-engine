package channel

import (
	"cs/game"
	"encoding/json"
	"fmt"

	"github.com/pion/webrtc/v3"
)

type ActionChannel struct {
	dc            *webrtc.DataChannel
	actionChannel chan game.Action
}

func (ac ActionChannel) SendText(msg string) error {
	return ac.dc.SendText(msg)
}

func (ac ActionChannel) handleMessage(actionType game.ActionType, msg []byte) error {
	switch actionType {
	case game.MOVE:
		var move game.MoveAction
		if err := json.Unmarshal(msg, &move); err != nil {
			fmt.Printf("%v", err)
			return err
		}
		ac.actionChannel <- move
	}

	return nil
}

func (ac ActionChannel) OnMessage(msg webrtc.DataChannelMessage) {
	var header game.ActionHeader
	if err := json.Unmarshal(msg.Data, &header); err != nil {
		fmt.Printf("%v", err)
		return
	}

	ac.handleMessage(header.ActionType, msg.Data)
}

func (ac ActionChannel) OnError(err error) {

}

func (ac ActionChannel) OnOpen() {

}

func (ac ActionChannel) OnClose() {

}
