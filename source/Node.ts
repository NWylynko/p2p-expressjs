import { JsonGetFetch, JsonPostFetch } from "./JsonFetch";
import { Message } from "./Message";

export interface Node {
  address: string;
  port: number;
  // online: boolean;
}

export interface TimedNode extends Node {
  timestamp: number;
}

export const registerNode = ({
  thisNode,
  peerNode,
}: {
  thisNode: Node;
  peerNode: Node;
}) => {
  return JsonPostFetch(
    `http://${peerNode.address}:${peerNode.port}/addNode`,
    thisNode
  );
};

export const pingNode = ({ node }: { node: Node }) => {
  return JsonGetFetch(`http://${node.address}:${node.port}/ping`);
};

export const sendMessage = ({
  node,
  message,
}: {
  node: Node;
  message: Message;
}) => {
  return JsonPostFetch(`http://${node.address}:${node.port}/message`, message);
};

// export const getNodes = async (
//   peerNode: Node,
//   hash: string
// ): Promise<{
//   success: boolean;
//   info: string;
//   data?: { [x: string]: Node };
// }> => {
//   const {
//     success,
//     info,
//     data,
//   }: { success: boolean; info: string; data?: string } = await JsonGetFetch(
//     `http://${peerNode.address}:${peerNode.port}/getNodes?hash=${hash}`
//   );
//   if (data !== undefined) {
//     const listOfNodes: { [x: string]: Node } = JSON.parse(data);
//     return { success, info, data: listOfNodes };
//   } else {
//     return { success, info };
//   }
// };
