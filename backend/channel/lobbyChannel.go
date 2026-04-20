package channel

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/pion/webrtc/v3"
)

type LobbyChannel struct {
	dc *webrtc.DataChannel
}

type LobbyOp uint32

const (
	lobbyCreated LobbyOp = iota
	playerConnected
)

type LobbyMessage struct {
	Operation LobbyOp `json:"operation"`
	Values    any     `json:"values"`
}

func (lc LobbyChannel) OnMessage(msg webrtc.DataChannelMessage) {
	fmt.Println(string(msg.Data))
}

func (lc LobbyChannel) OnOpen() {
	id := uuid.NewString()

	data, err := json.Marshal(LobbyMessage{Operation: playerConnected, Values: struct {
		PlayerId string `json:"playerId"`
	}{PlayerId: id}})

	if err != nil {
		lc.dc.SendText("failed")
	}

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
