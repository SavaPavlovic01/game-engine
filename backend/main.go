package main

import (
	"cs/channel"
	globalcontext "cs/globalContext"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/pion/webrtc/v3"
)

type SessionDescription struct {
	SDP  string `json:"sdp"`
	Type string `json:"type"`
}

type Connection struct {
	Id   string
	peer *webrtc.PeerConnection
	dc   *webrtc.DataChannel
}

func main() {

	globalcontext.Ctx = globalcontext.MakeGlobalCtx()

	http.Handle("/", http.FileServer(http.Dir("./client")))

	http.HandleFunc("/offer", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		var offer SessionDescription
		if err := json.NewDecoder(r.Body).Decode(&offer); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		peerConnection, err := webrtc.NewPeerConnection(webrtc.Configuration{})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		peerConnection.OnDataChannel(func(dc *webrtc.DataChannel) {
			fmt.Println("Channel opened:", dc.Label())
			channel, err := channel.MakeChannel(dc, dc.Label())
			if err != nil {
				fmt.Println(err)
			}

			dc.OnOpen(channel.OnOpen)
			dc.OnMessage(channel.OnMessage)
			dc.OnError(channel.OnError)
			dc.OnClose(channel.OnClose)
		})

		if err = peerConnection.SetRemoteDescription(webrtc.SessionDescription{
			Type: webrtc.SDPTypeOffer,
			SDP:  offer.SDP,
		}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		answer, err := peerConnection.CreateAnswer(nil)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		gatherComplete := webrtc.GatheringCompletePromise(peerConnection)

		if err = peerConnection.SetLocalDescription(answer); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		<-gatherComplete

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(SessionDescription{
			SDP:  peerConnection.LocalDescription().SDP,
			Type: peerConnection.LocalDescription().Type.String(),
		})

	})

	log.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
