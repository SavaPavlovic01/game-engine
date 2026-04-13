package main

import (
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

func main() {
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
			fmt.Println("DataChannel opened:", dc.Label())

			dc.OnOpen(func() {
				fmt.Println("DC ready, sending greeting")
				if err := dc.SendText("hello from server 👋"); err != nil {
					log.Println("Send error:", err)
				}
			})

			dc.OnMessage(func(msg webrtc.DataChannelMessage) {
				fmt.Printf("Client says: %s\n", string(msg.Data))
				dc.SendText("echo: " + string(msg.Data))
			})
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
