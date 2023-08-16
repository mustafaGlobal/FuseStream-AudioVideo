const handleGetRouterRtpCapabilities = async (ws: WebSocket, event: any) => {
  send(ws, 'getRouterRtpCapabilites', mediasoupRouter?.rtpCapabilities);
};

const handleCreateTransport = async (ws: WebSocket, event: any) => {
  try {
    const { transport, params } = await createWebRtcTransport(mediasoupRouter);
    producerTransport.set(transport.id, transport);
    send(ws, 'createTransport', params);
  } catch (error) {
    console.error('Failed creating producer transport: %o', error);
    send(ws, 'error', error);
    return;
  }
};

const handleConnectTransport = async (ws: WebSocket, event: any) => {
  const transport = producerTransport.get(event.data.producerId);
};
