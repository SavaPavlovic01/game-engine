package channel

import (
	"encoding/json"
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

type LobbyChannel struct {
	dc *webrtc.DataChannel
}

func (lc LobbyChannel) OnMessage(msg webrtc.DataChannelMessage) {
	lc.dc.SendText("idk what you want from me")
}

func (lc LobbyChannel) OnOpen() {
	data, _ := json.Marshal(LobbyInfo{Id: "someId", PlayerCnt: 1})
	lc.dc.Send(data)
}

func (lc LobbyChannel) OnClose() {

}

func (lc LobbyChannel) OnError(err error) {

}

type LobbyInfo struct {
	Id        string `json:"id"`
	PlayerCnt int32  `json:"playerCnt"`
}

func MakeChannel(dc *webrtc.DataChannel, label string) (Channel, error) {
	if label == "lobby" {
		return LobbyChannel{dc: dc}, nil
	}

	return LobbyChannel{dc: dc}, fmt.Errorf("not a channel i know")
}
