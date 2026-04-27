package game

type Action interface {
	GetTick() uint64
}

type MoveAction struct {
	Tick uint64
	DirX float32
	DirY float32
}

func (mv MoveAction) GetTick() uint64 {
	return mv.Tick
}
