package game

import (
	"cs/lobby"
	"encoding/json"
	"fmt"
	"time"
)

const (
	TICK_RATE    = 64
	TICK_PERIOD  = time.Second / TICK_RATE
	PLAYER_SPEED = 1
)

type PlayerState struct {
	PlayerId string  `json:"playerId"`
	X        float32 `json:"x"`
	Y        float32 `json:"y"`
}

type GameState struct {
	Tick    uint64
	Players map[string]*PlayerState
}

// TODO: ideas
// make one channel per player so one player cant fill up the channel
// you prob need to make like a map[tick]ActionMsg or whatever
type Game struct {
	Lobby   *lobby.Lobby
	Started bool

	ActionChannel chan Action
	quit          chan struct{}

	gameState GameState
}

func MakeGame(lobby *lobby.Lobby) *Game {
	state := GameState{
		Tick:    0,
		Players: make(map[string]*PlayerState),
	}

	for _, player := range lobby.Players {
		state.Players[player.Id] = &PlayerState{PlayerId: player.Id, X: 0, Y: 0}
	}

	return &Game{Lobby: lobby, Started: false, ActionChannel: make(chan Action, 1024), gameState: state, quit: make(chan struct{})}
}

func (g *Game) tick() {
	g.gameState.Tick += 1
}

func (g *Game) drainInput() {
	for {
		select {
		case action := <-g.ActionChannel:
			action.Apply(g)
		default:
			return
		}
	}
}

func (g *Game) StartLoop() {
	ticker := time.NewTicker(TICK_PERIOD)
	defer ticker.Stop()
	for {
		select {
		case <-g.quit:
			return
		case <-ticker.C:
			g.drainInput()
			g.tick()
			g.BroadcastState()
		}
	}
}

func (g *Game) BroadcastState() {
	type stateMsg struct {
		Tick    uint64                  `json:"tick"`
		Players map[string]*PlayerState `json:"players"`
	}
	msg := stateMsg{Tick: g.gameState.Tick, Players: g.gameState.Players}
	data, err := json.Marshal(msg)
	if err != nil {
		fmt.Printf("%v", err)
	}
	for _, player := range g.Lobby.Players {
		if player.ActionChannel == nil {
			continue
		}
		player.ActionChannel.SendText(string(data))
	}
}
