package lobby

import (
	"sync"
)

type MessageSender interface {
	SendText(msg string) error
}

type Player struct {
	Id            string
	InLobby       bool
	LobbyChannel  MessageSender
	ActionChannel MessageSender
	Mu            sync.RWMutex
}

func MakePlayer(Id string, lobbyChannel MessageSender) *Player {
	return &Player{Id: Id, InLobby: false, LobbyChannel: lobbyChannel}
}
