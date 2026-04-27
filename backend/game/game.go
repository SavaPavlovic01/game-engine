package game

import "cs/lobby"

// TODO: ideas
// make one channel per player so one player cant fill up the channel
// you prob need to make like a map[tick]ActionMsg or whatever
type Game struct {
	Lobby   *lobby.Lobby
	Started bool

	Tick uint64

	ActionChannel chan Action
}

func MakeGame(lobby *lobby.Lobby) *Game {
	return &Game{Lobby: lobby, Started: false, Tick: 0, ActionChannel: make(chan Action, 1024)}
}

func (g *Game) StartLoop() {

}
