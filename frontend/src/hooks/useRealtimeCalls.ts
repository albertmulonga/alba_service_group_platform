import { useRef, useState, useEffect, useCallback } from 'react'
import { connectRealtime, getSocket, onRealtime } from '@/lib/realtime'

export interface ActiveCallState {
  id: string
  callerId: string
  callerName: string
  receiverId: string
  receiverName: string
  type: 'audio' | 'video'
  status: 'ringing' | 'active' | 'ended'
  startedAt: string
}

export interface IncomingCallInfo {
  callerId: string
  callerName: string
  type: 'audio' | 'video'
}

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

export function useRealtimeCalls(token: string | null, currentUserId: string, currentUserName: string) {
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null)
  const [isIncoming, setIsIncoming] = useState(false)
  const [incomingInfo, setIncomingInfo] = useState<IncomingCallInfo | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerIdRef = useRef<string | null>(null)
  const connectedRef = useRef(false)

  const currentUserIdRef = useRef(currentUserId)
  const currentUserNameRef = useRef(currentUserName)
  const incomingTypeRef = useRef<'audio' | 'video'>('video')
  currentUserIdRef.current = currentUserId
  currentUserNameRef.current = currentUserName

  const cleanupLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
  }, [])

  const cleanupAll = useCallback(() => {
    cleanupLocalMedia()
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
    setRemoteStream(null)
    setActiveCall(null)
    setIsIncoming(false)
    setIncomingInfo(null)
  }, [cleanupLocalMedia])

  const acceptCall = useCallback(async () => {
    setIsIncoming(false)
    setIncomingInfo(null)
    try {
      let stream = localStreamRef.current
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: incomingTypeRef.current === 'video',
          audio: true,
        })
        localStreamRef.current = stream
        setLocalStream(stream)
      }
      const pc = pcRef.current
      if (pc && stream) {
        const existingTracks = pc.getSenders().map((s) => s.track)
        stream.getTracks().forEach((t) => {
          if (!existingTracks.includes(t)) pc.addTrack(t, stream)
        })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        if (peerIdRef.current) {
          getSocket()?.emit('call:answer', { peerId: peerIdRef.current, signal: pc.localDescription })
        }
      }
      setActiveCall((prev) => (prev ? { ...prev, status: 'active' } : prev))
    } catch (err) {
      console.error('acceptCall error:', err)
    }
  }, [])

  const endCall = useCallback(() => {
    if (peerIdRef.current) {
      getSocket()?.emit('call:end', { peerId: peerIdRef.current })
    }
    cleanupAll()
  }, [cleanupAll])

  const rejectCall = useCallback(() => {
    if (peerIdRef.current) {
      getSocket()?.emit('call:reject', { peerId: peerIdRef.current })
    }
    cleanupAll()
  }, [cleanupAll])

  const startCall = useCallback(
    async (receiverId: string, receiverName: string, type: 'audio' | 'video') => {
      if (!currentUserIdRef.current || !receiverId) return
      peerIdRef.current = receiverId
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true })
        localStreamRef.current = stream
        setLocalStream(stream)

        const pc = new RTCPeerConnection(ICE_SERVERS)
        pcRef.current = pc
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))
        pc.onicecandidate = (e) => {
          if (e.candidate && peerIdRef.current) {
            getSocket()?.emit('call:candidate', { peerId: peerIdRef.current, candidate: e.candidate })
          }
        }
        pc.ontrack = (e) => {
          const rs = e.streams[0] || new MediaStream([e.track])
          setRemoteStream(rs)
        }
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        getSocket()?.emit('call:offer', {
          peerId: receiverId,
          signal: pc.localDescription,
          type,
          from: { userId: currentUserIdRef.current, name: currentUserNameRef.current },
        })
        setActiveCall({
          id: `call-${Date.now()}`,
          callerId: currentUserIdRef.current,
          callerName: currentUserNameRef.current,
          receiverId,
          receiverName,
          type,
          status: 'ringing',
          startedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('startCall error:', err)
      }
    },
    []
  )

  const handleIncomingOffer = useCallback(async (payload: any) => {
    const callerId = payload?.fromUserId
    if (!callerId) return
    const type: 'audio' | 'video' = payload?.type === 'audio' ? 'audio' : 'video'
    incomingTypeRef.current = type
    peerIdRef.current = callerId
    setIsIncoming(true)
    setIncomingInfo({
      callerId,
      callerName: payload?.from?.name || 'Appelant',
      type,
    })

    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc
    pc.onicecandidate = (e) => {
      if (e.candidate && peerIdRef.current) {
        getSocket()?.emit('call:candidate', { peerId: peerIdRef.current, candidate: e.candidate })
      }
    }
    pc.ontrack = (e) => {
      const rs = e.streams[0] || new MediaStream([e.track])
      setRemoteStream(rs)
    }
    if (payload.signal) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.signal))
      } catch (err) {
        console.error('setRemoteDescription(offer) failed', err)
      }
    }
    setActiveCall({
      id: `call-${Date.now()}`,
      callerId,
      callerName: payload?.from?.name || 'Appelant',
      receiverId: currentUserIdRef.current,
      receiverName: currentUserNameRef.current,
      type,
      status: 'ringing',
      startedAt: new Date().toISOString(),
    })
  }, [])

  useEffect(() => {
    if (!token || !currentUserId) return
    connectRealtime(token)
    if (connectedRef.current) return
    connectedRef.current = true

    const off = onRealtime((event, payload) => {
      if (event === 'call:offer') {
        handleIncomingOffer(payload)
      } else if (event === 'call:answer' && payload?.fromUserId === peerIdRef.current) {
        if (pcRef.current && payload.signal) {
          pcRef.current
            .setRemoteDescription(new RTCSessionDescription(payload.signal))
            .catch(() => {})
        }
        setIsIncoming(false)
        setIncomingInfo(null)
        setActiveCall((prev) => (prev ? { ...prev, status: 'active' } : prev))
      } else if (event === 'call:candidate' && payload?.fromUserId === peerIdRef.current) {
        if (pcRef.current && payload.candidate) {
          pcRef.current.addIceCandidate(payload.candidate).catch(() => {})
        }
      } else if (event === 'call:rejected' && payload?.fromUserId === peerIdRef.current) {
        cleanupAll()
      } else if (event === 'call:ended' && payload?.fromUserId === peerIdRef.current) {
        cleanupAll()
      }
    })

    return () => {
      off()
      connectedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, handleIncomingOffer, cleanupAll])

  return {
    activeCall,
    isIncoming,
    incomingInfo,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
  }
}
