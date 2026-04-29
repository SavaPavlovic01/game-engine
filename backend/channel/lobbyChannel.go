package channel

import (
	"cs/game"
	globalcontext "cs/globalContext"
	"cs/lobby"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/pion/webrtc/v3"
)

type LobbyChannel struct {
	dc *webrtc.DataChannel
}

type LobbyOp uint32
type RequestState uint32

const (
	OK RequestState = iota
)

const (
	lobbyCreated LobbyOp = iota
	playerConnected
	joinLobby
	broadcast
	playerJoinedLobbyBroadcast
	startGame
)

type LobbyMessageOut struct {
	Operation LobbyOp `json:"operation"`
	Values    any     `json:"values"`
}

type LobbyMessageIn struct {
	Operation LobbyOp         `json:"operation"`
	Values    json.RawMessage `json:"values"`
}

type LobbyRequestResponse struct {
	Operation LobbyOp      `json:"operation"`
	Status    RequestState `json:"status"`
	Values    any          `json:"values"`
}

func (lc LobbyChannel) SendText(msg string) error {
	return lc.dc.SendText(msg)
}

func sendOpOkResponse(op LobbyOp, body any, dc *webrtc.DataChannel) {
	resp := LobbyRequestResponse{Operation: op, Status: OK, Values: body}

	data, err := json.Marshal(resp)
	if err != nil {
		fmt.Println("failed to marshal")
	}

	dc.SendText(string(data))
}

// TODO: maybe check if the player is in a lobby
func (lc LobbyChannel) handleStartGame(msg LobbyMessageIn) error {

	fmt.Println("starting game")
	type msgValue struct {
		PlayerId string `json:"playerId"`
		LobbyId  string `json:"lobbyId"`
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

	game := game.MakeGame(lobby)

	err = globalcontext.Ctx.AddGame(game)
	if err != nil {
		fmt.Printf("im here %v", err)
		return err
	}

	data, err := json.Marshal(LobbyRequestResponse{Operation: startGame, Status: OK})
	if err != nil {
		return err
	}

	err = lobby.Broadcast(string(data), "")
	if err != nil {
		return err
	}

	go game.StartLoop()

	fmt.Println("started game")
	return nil
}

func (lc LobbyChannel) handleCreateLobby(msg LobbyMessageIn) error {
	fmt.Println("got a make lobby request")
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
	fmt.Println("got player " + player.Id)
	id, err := globalcontext.Ctx.AddLobbyWithPlayer(player)
	fmt.Println("made a lobby " + id)
	if err != nil {
		return err
	}

	fmt.Println("sending ok")

	sendOpOkResponse(msg.Operation, struct {
		LobbyId string `json:"lobbyId"`
	}{LobbyId: id}, lc.dc)

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

	data, err := json.Marshal(LobbyRequestResponse{Operation: playerJoinedLobbyBroadcast, Status: OK, Values: struct {
		PlayerCnt int32 `json:"playerCnt"`
	}{int32(lobby.PlayerCnt)}})

	err = lobby.Broadcast(string(data), player.Id)
	if err != nil {
		return err
	}

	sendOpOkResponse(msg.Operation, struct {
		LobbyId   string `json:"lobbyId"`
		PlayerCnt int32  `json:"playerCnt"`
	}{LobbyId: lobby.Id, PlayerCnt: int32(lobby.PlayerCnt)}, lc.dc)
	return nil
}

func (lc LobbyChannel) handleBroadcast(msg LobbyMessageIn) error {
	type msgValue struct {
		PlayerId string `json:"playerId"`
		LobbyId  string `json:"lobbyId"`
		Message  string `json:"message"`
	}

	var values msgValue
	err := json.Unmarshal(msg.Values, &values)
	if err != nil {
		return err
	}

	lobby, err := globalcontext.Ctx.GetLobby(values.LobbyId)
	if err != nil {
		return err
	}

	sendOpOkResponse(msg.Operation, struct{}{}, lc.dc)

	return lobby.Broadcast(values.Message, values.PlayerId)
}

func (lc LobbyChannel) handleMessage(msg LobbyMessageIn) {
	handleError := func(err error) {
		if err != nil {
			fmt.Println("failed to do something")
			lc.dc.SendText("failed to perform operation, error:" + err.Error())
		}
	}
	fmt.Println("im here dumbass")
	switch msg.Operation {
	case lobbyCreated:
		handleError(lc.handleCreateLobby(msg))
	case joinLobby:
		handleError(lc.handleJoinLobby(msg))
	case broadcast:
		handleError(lc.handleBroadcast(msg))
	case startGame:
		handleError(lc.handleStartGame(msg))
	default:
		fmt.Println("i dont recognize that ")
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

	data, err := json.Marshal(LobbyRequestResponse{Operation: playerConnected, Status: OK, Values: struct {
		PlayerId string `json:"playerId"`
	}{PlayerId: id}})

	if err != nil {
		lc.dc.SendText("failed")
	}

	fmt.Println("send player id")
	_ = lc.dc.SendText(string(data))
	player := lobby.MakePlayer(id, lc)
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
