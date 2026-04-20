package lobby

import (
	"fmt"
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
	return &Lobby{Id: uuid.NewString(), PlayerCnt: 0}
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
