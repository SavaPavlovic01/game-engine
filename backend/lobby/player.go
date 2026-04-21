package lobby

import (
	"sync"

	"github.com/pion/webrtc/v3"
)

type Player struct {
	Id           string
	InLobby      bool
	LobbyChannel *webrtc.DataChannel
	Mu           sync.RWMutex
}

func MakePlayer(Id string, lobbyChannel *webrtc.DataChannel) *Player {
	return &Player{Id: Id, InLobby: false, LobbyChannel: lobbyChannel}
}
