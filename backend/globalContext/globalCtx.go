package globalcontext

import (
	"cs/lobby"
	"fmt"
	"sync"
)

var Ctx *GlobalCtx

type GlobalCtx struct {
	Lobbies map[string]*lobby.Lobby
	Players map[string]*lobby.Player // idk if i really need this

	playerMu sync.RWMutex
	lobbyMu  sync.RWMutex
}

func MakeGlobalCtx() *GlobalCtx {
	return &GlobalCtx{Lobbies: make(map[string]*lobby.Lobby), Players: make(map[string]*lobby.Player)}
}

func (gc *GlobalCtx) AddPlayer(player *lobby.Player) error {
	gc.playerMu.Lock()
	defer gc.playerMu.Unlock()
	if _, contains := gc.Players[player.Id]; contains {
		return fmt.Errorf("failed to add player, player with id %s already exists", player.Id)
	}
	gc.Players[player.Id] = player

	return nil
}

func (gc *GlobalCtx) GetPlayer(Id string) (*lobby.Player, error) {
	gc.playerMu.RLock()
	defer gc.playerMu.RUnlock()
	player, contains := gc.Players[Id]
	if !contains {
		return nil, fmt.Errorf("player with id=%s does not exist", Id)
	}
	return player, nil
}

func (gc *GlobalCtx) GetLobby(Id string) (*lobby.Lobby, error) {
	gc.lobbyMu.RLock()
	defer gc.lobbyMu.RUnlock()
	lobby, contains := gc.Lobbies[Id]
	if !contains {
		return nil, fmt.Errorf("lobby with id=%s does not exist", Id)
	}
	return lobby, nil
}

func (gc *GlobalCtx) AddLobbyWithPlayer(player *lobby.Player) (string, error) {
	player.Mu.Lock()
	if player.InLobby {
		player.Mu.Unlock()
		return "", fmt.Errorf("player is already in lobby")
	}

	player.InLobby = true
	player.Mu.Unlock()

	lobby := lobby.MakeLobby()
	lobby.AddPlayer(player)

	gc.lobbyMu.Lock()
	gc.Lobbies[lobby.Id] = lobby
	gc.lobbyMu.Unlock()
	return lobby.Id, nil
}
