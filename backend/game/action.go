package game

import "fmt"

type Action interface {
	GetTick() uint64
	Apply(*Game) error
}

type ActionType uint32

const (
	MOVE ActionType = iota
	ROTATION
)

type ActionHeader struct {
	PlayerId   string     `json:"playerId"`
	ActionType ActionType `json:"actionType"`
	Tick       uint64     `json:"tick"`
}

type MoveAction struct {
	ActionHeader
	DirX float32 `json:"dirx"`
	DirY float32 `json:"diry"`
}

type RotationAction struct {
	ActionHeader
	XRot float32 `json:"xrot"`
	YRot float32 `json:"yrot"`
}

func (mv MoveAction) GetTick() uint64 {
	return mv.Tick
}

func (a MoveAction) Apply(g *Game) error {
	player, ok := g.gameState.Players[a.PlayerId]
	if !ok {
		return fmt.Errorf("failed to move player, player with id = %s does not exist", a.PlayerId)
	}

	player.X += a.DirX * PLAYER_SPEED //* float32(TICK_PERIOD.Seconds())
	player.Y += a.DirY * PLAYER_SPEED //* float32(TICK_PERIOD.Seconds())
	return nil
}

func (a RotationAction) GetTick() uint64 {
	return a.Tick
}

func (a RotationAction) Apply(g *Game) error {
	player, ok := g.gameState.Players[a.PlayerId]
	if !ok {
		return fmt.Errorf("failed to rotate player, player with id = %s does not exist", a.PlayerId)
	}

	fmt.Println("rotating player")
	fmt.Printf("%f %f", a.XRot, a.YRot)
	player.XRot = a.XRot
	player.YRot = a.YRot
	return nil
}
