import { UR } from '@keystonehq/keystone-sdk/dist/types/ur';
import { parseTonAccount } from '@keystonehq/keystone-sdk/dist/wallet/hdKey';
import { Address } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton/dist/wallets/WalletContractV4';
import { WalletContractV5R1 } from '@ton/ton/dist/wallets/WalletContractV5R1';
import queryString from 'query-string';
import { IStorage } from '../Storage';
import { APIConfig } from '../entries/apis';
import { Network } from '../entries/network';
import { AuthKeychain, AuthPassword } from '../entries/password';
import {
    defaultWalletVersion,
    StandardTonWalletState,
    TonWalletState,
    WalletId,
    WalletState,
    WalletVersion,
    WalletVersions
} from "../entries/wallet";
import { WalletApi } from '../tonApiV2';
import { walletContract } from './wallet/contractService';
import { BLOCKCHAIN_NAME } from '../entries/crypto';
import { walletsStorage } from './walletsService';
import { emojis } from '../utils/emojis';
import { formatAddress } from '../utils/common';

export const createStandardTonWalletStateByMnemonic = async (
    api: APIConfig,
    mnemonic: string[],
    options: {
        version?: WalletVersion;
        network?: Network;
        auth: AuthPassword | Omit<AuthKeychain, 'keychainStoreKey'>;
        name?: string;
    }
) => {
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    const publicKey = keyPair.publicKey.toString('hex');

    const address = await findWalletAddress(api, publicKey, options.version, options.network);

    let walletAuth: AuthPassword | AuthKeychain;
    if (options.auth.kind === 'keychain') {
        walletAuth = {
            kind: 'keychain',
            keychainStoreKey: publicKey
        };
    } else {
        walletAuth = options.auth;
    }

    const state: TonWalletState = {
        blockchain: BLOCKCHAIN_NAME.TON,
        id: address.rawAddress,
        type: 'standard',
        publicKey,
        rawAddress: address.rawAddress,
        version: address.version,
        name: options.name || getFallbackWalletName(Address.parse(address.rawAddress)),
        emoji: getFallbackWalletEmoji(publicKey),
        auth: walletAuth,
        network: Network.MAINNET
    };

    return state;
};

const versionMap: Record<string, WalletVersion> = {
    wallet_v3r1: WalletVersion.V3R1,
    wallet_v3r2: WalletVersion.V3R2,
    wallet_v4r2: WalletVersion.V4R2,
    wallet_v5_beta: WalletVersion.V5_BETA,
    wallet_v5r1: WalletVersion.V5R1
};

const findWalletVersion = (interfaces?: string[]): WalletVersion => {
    if (!interfaces) {
        throw new Error('Unexpected wallet version');
    }
    for (const value of interfaces) {
        if (versionMap[value] !== undefined) {
            return versionMap[value];
        }
    }
    throw new Error('Unexpected wallet version');
};

const findWalletAddress = async (
    api: APIConfig,
    publicKey: string,
    version?: WalletVersion,
    network?: Network
): Promise<{ rawAddress: string; version: WalletVersion }> => {
    if (version !== undefined) {
        const parsed = getWalletAddress(publicKey, version, network);
        return {
            rawAddress: parsed.address.toRawString(),
            version
        };
    }

    try {
        const result = await new WalletApi(api.tonApiV2).getWalletsByPublicKey({
            publicKey: publicKey
        });

        const [activeWallet] = result.accounts
            .filter(wallet => {
                if (wallet.interfaces?.some(value => Object.keys(versionMap).includes(value))) {
                    return wallet.balance > 0 || wallet.status === 'active';
                }
                return false;
            })
            .sort((one, two) => two.balance - one.balance);

        if (activeWallet) {
            return {
                rawAddress: activeWallet.address,
                version: findWalletVersion(activeWallet.interfaces)
            };
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(e);
    }

    const contact = WalletContractV5R1.create({
        workChain: 0,
        publicKey: Buffer.from(publicKey, 'hex')
    });
    return {
        rawAddress: contact.address.toRawString(),
        version: defaultWalletVersion
    };
};

export const getWalletAddress = (
    publicKey: Buffer | string,
    version: WalletVersion,
    network?: Network
): { address: Address; version: WalletVersion } => {
    if (typeof publicKey === 'string') {
        publicKey = Buffer.from(publicKey, 'hex');
    }
    const { address } = walletContract(publicKey, version, network);
    return {
        address,
        version
    };
};

export const getWalletsAddresses = (
    publicKey: Buffer | string,
    network?: Network
): Record<(typeof WalletVersions)[number], { address: Address; version: WalletVersion }> => {
    if (typeof publicKey === 'string') {
        publicKey = Buffer.from(publicKey, 'hex');
    }

    return Object.fromEntries(
        WalletVersions.map(version => [
            version,
            getWalletAddress(publicKey as Buffer, version, network)
        ])
    ) as Record<(typeof WalletVersions)[number], { address: Address; version: WalletVersion }>;
};

export const updateWalletProperty = async (
    storage: IStorage,
    walletId: WalletId,
    props: Partial<Pick<TonWalletState, 'name' | 'network' | 'emoji'>>
) => {
    const wallet = (await walletsStorage(storage).getWallet(walletId))!;
    const updated: WalletState = {
        ...wallet,
        ...props
    };
    await walletsStorage(storage).updateWalletInState(updated);
};

export const walletStateFromSignerQr = async (
    api: APIConfig,
    qrCode: string
): Promise<StandardTonWalletState> => {
    if (!qrCode.startsWith('tonkeeper://signer')) {
        throw new Error('Unexpected QR code');
    }

    const {
        query: { pk, name }
    } = queryString.parseUrl(qrCode);

    if (typeof pk != 'string') {
        throw new Error('Unexpected QR code');
    }
    if (typeof name != 'string') {
        throw new Error('Unexpected QR code');
    }

    const publicKey = pk;

    const active = await findWalletAddress(api, publicKey);

    return {
        type: 'standard',
        blockchain: BLOCKCHAIN_NAME.TON,
        id: active.rawAddress,
        network: Network.MAINNET,
        version: active.version,
        rawAddress: active.rawAddress,
        publicKey,
        name: name || getFallbackWalletName(Address.parse(active.rawAddress)),
        auth: { kind: 'signer' },
        emoji: getFallbackWalletEmoji(publicKey)
    };
};

export const walletStateFromSignerDeepLink = async (
    api: APIConfig,
    publicKey: string,
    name: string | null
): Promise<WalletState> => {
    const active = await findWalletAddress(api, publicKey);

    return {
        publicKey,
        rawAddress: active.rawAddress,
        version: active.version,
        type: 'standard',
        blockchain: BLOCKCHAIN_NAME.TON,
        id: active.rawAddress,
        network: Network.MAINNET,
        name: name || getFallbackWalletName(Address.parse(active.rawAddress)),
        auth: { kind: 'signer-deeplink' },
        emoji: getFallbackWalletEmoji(publicKey)
    };
};

export const walletStateFromLedger = (walletInfo: {
    address: string;
    publicKey: Buffer;
    accountIndex: number;
}): StandardTonWalletState => {
    const address = Address.parse(walletInfo.address);
    const publicKey = walletInfo.publicKey.toString('hex');

    return {
        network: Network.MAINNET,
        blockchain: BLOCKCHAIN_NAME.TON,
        type: 'standard',
        publicKey,
        id: address.toRawString(),
        rawAddress: address.toRawString(),
        version: WalletVersion.V4R2,
        name: `Ledger ${walletInfo.accountIndex + 1}`,
        auth: { kind: 'ledger', accountIndex: walletInfo.accountIndex },
        emoji: getFallbackWalletEmoji(publicKey)
    };
};

export const walletStateFromKeystone = (ur: UR) => {
    const account = parseTonAccount(ur);
    const contact = WalletContractV4.create({
        workchain: 0,
        publicKey: Buffer.from(account.publicKey, 'hex')
    });

    const pathInfo =
        account.path && account.xfp ? { path: account.path, mfp: account.xfp } : undefined;

    const state: StandardTonWalletState = {
        publicKey: account.publicKey,
        rawAddress: contact.address.toRawString(),
        version: WalletVersion.V4R2,
        type: 'standard',
        blockchain: BLOCKCHAIN_NAME.TON,
        id: contact.address.toRawString(),
        network: Network.MAINNET,
        name: account.name ?? 'Keystone',
        auth: { kind: 'keystone', info: pathInfo },
        emoji: getFallbackWalletEmoji(account.publicKey)
    };

    return state;
};

export function getFallbackWalletEmoji(publicKey: string) {
    const index = Number('0x' + publicKey.slice(-6)) % emojis.length;
    return emojis[index];
}

export function getFallbackWalletName(address: Address) {
    return 'Wallet ' + formatAddress(address).slice(-4);
}
