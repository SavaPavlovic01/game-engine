package lobby

import (
	"fmt"
	"maps"
	"slices"
	"sync"

	"github.com/google/uuid"
)

type Lobby struct {
	Id        string
	PlayerCnt uint32
	Players   map[string]*Player

	mu sync.RWMutex
}

func MakeLobby() *Lobby {
	return &Lobby{Id: uuid.NewString(), PlayerCnt: 0, Players: make(map[string]*Player)}
}

func (l *Lobby) AddPlayer(player *Player) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if _, contains := l.Players[player.Id]; contains {
		return fmt.Errorf("player with id %s already in lobby", player.Id)
	}

	l.PlayerCnt += 1
	l.Players[player.Id] = player

	return nil
}

func (l *Lobby) GetPlayerIds() []string {
	l.mu.RLock()
	defer l.mu.RUnlock()
	ids := slices.Collect(maps.Keys(l.Players))
	return ids
}

func (l *Lobby) Broadcast(msg string, skipId string) error {
	l.mu.RLock()

	l.mu.RLock()
	players := make([]*Player, 0, len(l.Players))
	for _, p := range l.Players {
		players = append(players, p)
	}
	l.mu.RUnlock()

	for _, player := range players {
		if player.Id != skipId {
			player.LobbyChannel.SendText(msg)
		}
	}

	return nil
}
