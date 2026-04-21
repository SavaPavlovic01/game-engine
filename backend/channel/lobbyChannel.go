package channel

import (
	globalcontext "cs/globalContext"
	"cs/lobby"
	"encoding/json"

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
	joinLobby
)

type LobbyMessageOut struct {
	Operation LobbyOp `json:"operation"`
	Values    any     `json:"values"`
}

type LobbyMessageIn struct {
	Operation LobbyOp `json:"operation"`
	Values    []byte  `json:"values"`
}

func (lc LobbyChannel) handleCreateLobby(msg LobbyMessageIn) error {
	type msgValue struct {
		PlayerId string `json:"playerId"`
	}
	var value msgValue
	err := json.Unmarshal(msg.Values, &value)
	if err != nil {
		return err
	}
	player, err := globalcontext.Ctx.GetPlayer(value.PlayerId)
	if err != nil {
		return err
	}
	err = globalcontext.Ctx.AddLobbyWithPlayer(player)
	if err != nil {
		return err
	}
	return nil
}

func (lc LobbyChannel) handleJoinLobby(msg LobbyMessageIn) error {
	type msgValue struct {
		PlayerId string `json:"playerId"`
		LobbyId  string `json:"lobbyId"`
	}

	var value msgValue
	err := json.Unmarshal(msg.Values, &value)
	if err != nil {
		return err
	}

	player, err := globalcontext.Ctx.GetPlayer(value.PlayerId)
	if err != nil {
		return err
	}

	lobby, err := globalcontext.Ctx.GetLobby(value.LobbyId)
	if err != nil {
		return err
	}
	err = lobby.AddPlayer(player)
	if err != nil {
		return err
	}
	return nil
}

func (lc LobbyChannel) handleBroadcast(msg LobbyMessageIn) error {
	type msgValue struct {
		PlayerId string `json:"playerId"`
		LobbyId  string `json:"lobbyId"`
		Message  string `json:"message"`
	}

	var value msgValue
	err := json.Unmarshal(msg.Values, &value)
	if err != nil {
		return err
	}

	lobby, err := globalcontext.Ctx.GetLobby(value.LobbyId)
	if err != nil {
		return err
	}

	return lobby.Broadcast(value.Message)
}

func (lc LobbyChannel) handleMessage(msg LobbyMessageIn) {
	handleError := func(err error) {
		if err != nil {
			lc.dc.SendText("failed to create lobby, error:" + err.Error())
		}
	}

	switch msg.Operation {
	case lobbyCreated:
		handleError(lc.handleCreateLobby(msg))
	case joinLobby:
		handleError(lc.handleJoinLobby(msg))
	}
}

func (lc LobbyChannel) OnMessage(msg webrtc.DataChannelMessage) {
	var msgIn LobbyMessageIn
	err := json.Unmarshal(msg.Data, &msgIn)
	if err != nil {
		lc.dc.SendText("failed to parse message, error:" + err.Error())
		return
	}
	lc.handleMessage(msgIn)
}

func (lc LobbyChannel) OnOpen() {
	id := uuid.NewString()

	data, err := json.Marshal(LobbyMessageOut{Operation: playerConnected, Values: struct {
		PlayerId string `json:"playerId"`
	}{PlayerId: id}})

	if err != nil {
		lc.dc.SendText("failed")
	}

	_ = lc.dc.SendText(string(data))
	player := lobby.MakePlayer(id, lc.dc)
	globalcontext.Ctx.AddPlayer(player)
}

// TODO: make it send the id so i can clean it up
func (lc LobbyChannel) OnClose() {

}

func (lc LobbyChannel) OnError(err error) {

}

type LobbyInfo struct {
	Id        string `json:"id"`
	PlayerCnt int32  `json:"playerCnt"`
}
