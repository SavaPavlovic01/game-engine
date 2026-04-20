package globalcontext

import "cs/lobby"

var Ctx *GlobalCtx

type GlobalCtx struct {
	Lobbies map[string]*lobby.Lobby
	Players map[string]*lobby.Player // idk if i really need this
}

func MakeGlobalCtx() *GlobalCtx {
	return &GlobalCtx{Lobbies: make(map[string]*lobby.Lobby), Players: make(map[string]*lobby.Player)}
}

func (gc *GlobalCtx) AddPlayer() {

}
