import "source-map-support/register";
import "dotenv/config";
import React, { useEffect, useState } from "react";
import { Text } from "ink";
import express from "express";
import net from "net";
import { Node, TimedNode, registerNode, pingNode, sendMessage } from "./Node";
import { hashObject } from "./hashObject";
import { Message } from "./Message";

const { PORT } = process.env;

const app = express();
app.use(express.json());

let nodes: { [x: string]: Node } = {};
let recentRequests: { [x: string]: TimedNode } = {};
let nodesListOfHashes: string[] = [];
let HashOfAllNodes: string = hashObject(nodesListOfHashes);
let HashOfMySelf: string;
let thisNode: Node;
let messages: { [x: string]: Message } = {};

const addNode = (newNode: Node) => {
  const key = hashObject(newNode);
  const newNodes = { [key]: newNode };
  updateNodes(newNodes);
};
const updateNodes = (newNodes?: { [x: string]: Node }) => {
  nodes = { ...nodes, ...newNodes };
  nodesListOfHashes = Object.keys(nodes);
  HashOfAllNodes = hashObject(nodesListOfHashes.sort());
  console.log(`new hash ${HashOfAllNodes}`);
};

app.post("/message", (req, res) => {
  console.log(`------- /message -----`);
  const message: Message = req.body;
  const hashOfMessage = hashObject(message);
  if (messages[hashOfMessage] !== undefined) {
    console.log(`i already got this message`);
    res.json({ success: false, info: "ive already got that message mate" });
  } else {
    messages[hashOfMessage] = message;
    console.log(`message:`, message);
    res.json({ success: true, info: "thanks for the message" });
    nodesListOfHashes.forEach((nodeHash) => {
      const peerNode = nodes[nodeHash];
      if (peerNode !== undefined) {
        sendMessage({ node: peerNode, message });
      }
    });
  }
  console.log(`--------------------`);
});

app.post("/addNode", (req, res) => {
  const { address, port }: Node = req.body;
  const newNode: Node = { address, port };
  const hashOfNewNode = hashObject(newNode);
  console.log(`---------- /addNode ---------`);
  console.log("add node request", { ...newNode, hash: hashOfNewNode });

  const nodeInRecentsList: TimedNode | undefined =
    recentRequests[hashOfNewNode];

  if (hashOfNewNode === HashOfMySelf) {
    console.log(`i got a request to add myself, thats a yikes`);
    res.json({ success: false, info: "this is myself" });
  } else if (
    nodeInRecentsList !== undefined &&
    Date.now() - nodeInRecentsList.timestamp < 15000
  ) {
    console.log(`node is in recent nodes list, skipping request`);
    res.json({
      success: false,
      info: "you asked me a couple seconds ago buddy",
    });
  }
  // 																	need to make sure we don't already have this node
  else if (nodesListOfHashes.length < 3 && nodes[hashOfNewNode] === undefined) {
    console.log("im not full, adding this node", newNode);
    addNode(newNode);
    res.json({ success: true, info: "welcome to the network" });
  } else {
    console.log("im full, telling my peers", newNode);
    nodesListOfHashes.forEach((nodeHash) => {
      const peerNode = nodes[nodeHash];
      if (peerNode !== undefined) {
        registerNode({
          thisNode: newNode,
          peerNode,
        });
      }
    });
    res.json({ success: true, info: "I'm full, i've asked my peers" });
  }
  console.log(`adding to recent nodes list`);
  recentRequests[hashOfNewNode] = { ...newNode, timestamp: Date.now() };

  console.log(`--------------------`);
});

app.get("/ping", (_, res) => {
  console.log(`-------- /ping -----`);
  console.log(`got ping request`);
  res.json({ success: true, info: "i'm alive" });
  console.log(`-----------------`);
});

// app.get("/getNodes", (req, res) => {
//   const { hash } = req.query;

//   if (hash === HashOfAllNodes) {
//     res.json({ success: false, info: "we have the same list of hashes" });
//   } else {
//     res.json({
//       success: true,
//       info: "here have my nodes",
//       data: JSON.stringify(nodes),
//     });
//   }
// });

setInterval(async () => {
  await Promise.all(
    nodesListOfHashes.map(async (nodeHash) => {
      // if (nodeHash === HashOfMySelf) {
      //   return;
      // }
      const peerNode: Node | undefined = nodes[nodeHash];
      if (peerNode === undefined) {
        return;
      }
      console.log(`pinging`, peerNode);
      // try {
      // const { success, data: listOfNodes } = await getNodes(
      //   peerNode,
      //   HashOfAllNodes
      // );
      const { success } = await pingNode({ node: peerNode });
      if (!success) {
        console.log(`couldn't ping`, nodes[nodeHash], `removing from list`);
        delete nodes[nodeHash];
      }
      // if (success && listOfNodes) {
      //   console.log(`got nodes of`, peerNode);
      //   updateNodes(listOfNodes);
      // } else {
      //   console.log(`didnt get nodes of`, peerNode);
      // }
      // } catch (error) {
      // nodes[nodeHash].online = false;
      // }
    })
  );
}, 5000);

setInterval(async () => {
  if (nodesListOfHashes.length < 3) {
    console.log(
      `I don't have enough peers, lets ask the ones i have if they know anyone`
    );
    await Promise.all(
      nodesListOfHashes.map(async (nodeHash) => {
        const peerNode: Node | undefined = nodes[nodeHash];
        if (peerNode === undefined) {
          return;
        }
        console.log(`asking`, peerNode, `if he knows anyone`);
        return registerNode({ thisNode, peerNode });
      })
    );
  }
}, 15000);

interface AppProps {
  upstreamAddress?: string;
  upstreamPort?: number;
}

const App = ({ upstreamAddress, upstreamPort }: AppProps) => {
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    if (upstreamAddress && upstreamPort) {
      console.log("connecting to upstream");
      addNode({ address: upstreamAddress, port: upstreamPort });
    } else {
      console.log("no upstream!!");
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Text>{timestamp}</Text>
      <Text>my hash {HashOfMySelf}</Text>
      <Text>Current Nodes</Text>
      <Text>{JSON.stringify(nodes, null, 2)}</Text>
      <Text>Recent node requests</Text>
      <Text>{JSON.stringify(recentRequests, null, 2)}</Text>
      <Text>messages</Text>
      <Text>{JSON.stringify(messages, null, 2)}</Text>
      {/* {nodesListOfHashes.map((nodeHash) => {
        const node = nodes[nodeHash];
        if (!node) {
          return <></>;
        }
        return (
          <Box key={nodeHash} padding={1} flexDirection="column">
            <Text>Hash: {nodeHash}</Text>
            <Text>Address: {node.address}</Text>
            <Text>Port: {node.port}</Text>
          </Box>
        );
      })} */}
    </>
  );
};

export default App;

const server = app.listen(
  (PORT && parseInt(PORT, 10)) || 0,
  "localhost",
  () => {
    const { address, port } = server.address() as net.AddressInfo;
    thisNode = { address, port };
    HashOfMySelf = hashObject(thisNode);

    console.log(`listening on http://${address}:${port}/`);

    if (nodesListOfHashes.length !== 0) {
      nodesListOfHashes.forEach((nodeHash) => {
        const peerNode: Node | undefined = nodes[nodeHash];
        if (peerNode !== undefined) {
          registerNode({ thisNode, peerNode });
        }
      });
    }
  }
);
