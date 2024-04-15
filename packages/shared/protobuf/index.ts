import * as protobuf from 'protobufjs';

const utilityPath = 'utility';

const derivationPathMessageType = `${utilityPath}.DerivationPath`;
const createTxMessageType = `${utilityPath}.CreateTxRequest`;
const broadcastTxMessageType = `${utilityPath}.BoradcastTxRequest`;

const utilityRoot = protobuf.loadSync('./utility.proto');
export const DerivationPath = utilityRoot.lookupType(derivationPathMessageType);
export const CreateTxRequest = utilityRoot.lookupType(createTxMessageType);
export const BroadcastTxRequest = utilityRoot.lookupType(broadcastTxMessageType);

const relayPath = 'relay';
const utxoTypeEnumType = `${relayPath}.UTXOType`;
const xtzAdditionalParamsType = `${relayPath}.XTZAdditionalParams`;
const xrpAdditionalParamsType = `${relayPath}.XRPAdditionalParams`;
const xlmAdditionalParamsType = `${relayPath}.XLMAdditionalParams`;
const tronAdditionalParamsType = `${relayPath}.TronAdditionalParams`;
const lunaAdditionalParamsType = `${relayPath}.LUNAAdditinalParams`;
const dotKsmAdditionalParamsType = `${relayPath}.DOT_KSMAdditionalParams`;
const hbarAdditionalParamsType = `${relayPath}.HBARAdditionalParams`;
const unsignedTxType = `${relayPath}.UnsignedTx`;

const relayRoot = protobuf.loadSync('./relay.proto');
export const UTXOTypeEnum = relayRoot.lookupEnum(utxoTypeEnumType);
export const UnsignedTx = relayRoot.lookupType(unsignedTxType);
export const HBARAdditionalParams = relayRoot.lookupType(hbarAdditionalParamsType);
export const DOTKSMAdditionalParams = relayRoot.lookupType(dotKsmAdditionalParamsType);
export const LUNAAdditinalParams = relayRoot.lookupType(lunaAdditionalParamsType);
export const TronAdditionalParams = relayRoot.lookupType(tronAdditionalParamsType);
export const XLMAdditionalParams = relayRoot.lookupType(xlmAdditionalParamsType);
export const XRPAdditionalParams = relayRoot.lookupType(xrpAdditionalParamsType);
export const XTZAdditionalParams = relayRoot.lookupType(xtzAdditionalParamsType);
