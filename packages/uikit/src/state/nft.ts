import { useAppContext } from '../hooks/appContext';
import { useAppSdk } from '../hooks/appSdk';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getActiveWalletConfig } from '@tonkeeper/core/dist/service/wallet/configService';
import { useActiveWallet, useActiveWalletConfig, useMutateActiveWalletConfig } from './wallet';
import { NFT } from '@tonkeeper/core/dist/entries/nft';
import { DefaultRefetchInterval, useTonenpointConfig } from './tonendpoint';
import { ActiveWalletConfig } from '@tonkeeper/core/dist/entries/wallet';
import { useTranslation } from '../hooks/translation';
import {
    AccountsApi,
    BlockchainApi,
    DNSApi,
    DnsRecord,
    NFTApi,
    NftCollection,
    NftItem
} from '@tonkeeper/core/dist/tonApiV2';
import { QueryKey } from '../libs/queryKey';
import { isTONDNSDomain } from '@tonkeeper/core/dist/utils/nft';
import { useMemo } from 'react';

type NftWithCollectionId = Pick<NFT, 'address'> & {
    collection?: Pick<Required<NFT>['collection'], 'address'>;
};

export const useMarkNftAsSpam = () => {
    const wallet = useActiveWallet();
    const sdk = useAppSdk();
    const { mutateAsync } = useMutateActiveWalletConfig();
    const { tonendpoint } = useAppContext();
    const { data: tonendpointConfig } = useTonenpointConfig(tonendpoint);
    const { t } = useTranslation();
    return useMutation<void, Error, NftWithCollectionId>(async nft => {
        let config = await getActiveWalletConfig(sdk.storage, wallet.rawAddress, wallet.network);

        const address = nft.collection?.address || nft.address;

        if (!config.spamNfts.includes(address) && tonendpointConfig?.scam_api_url) {
            let baseUrl = tonendpointConfig?.scam_api_url;
            if (baseUrl.endsWith('/')) {
                baseUrl = baseUrl.slice(0, baseUrl.length - 1);
            }
            try {
                await fetch(`${baseUrl}/report/${address}`, {
                    method: 'POST'
                });
            } catch (e) {
                console.error(e);
            }
        }

        config = {
            ...config,
            spamNfts: config.spamNfts.filter(i => i !== address).concat(address),
            trustedNfts: config.trustedNfts.filter(item => item !== address)
        };

        await mutateAsync(config);
        sdk.topMessage(
            nft.collection?.address
                ? t('suspicious_status_update_spam_collection')
                : t('suspicious_status_update_spam_nft')
        );
    });
};

export const useMarkNftAsTrusted = () => {
    const wallet = useActiveWallet();
    const sdk = useAppSdk();
    const { mutateAsync } = useMutateActiveWalletConfig();
    return useMutation<void, Error, NftWithCollectionId | string>(async nft => {
        let config = await getActiveWalletConfig(sdk.storage, wallet.rawAddress, wallet.network);

        const address = typeof nft === 'string' ? nft : nft.collection?.address || nft.address;

        config = {
            ...config,
            spamNfts: config.spamNfts.filter(item => item !== address),
            trustedNfts: config.trustedNfts.filter(i => i !== address).concat(address)
        };

        await mutateAsync(config);
    });
};

export const useHideNft = () => {
    const wallet = useActiveWallet();
    const sdk = useAppSdk();
    const { mutateAsync } = useMutateActiveWalletConfig();
    const { t } = useTranslation();
    return useMutation<void, Error, NftWithCollectionId>(async nft => {
        let config = await getActiveWalletConfig(sdk.storage, wallet.rawAddress, wallet.network);

        const address = nft.collection?.address || nft.address;

        if (config.hiddenNfts.includes(address)) {
            return;
        }

        config = {
            ...config,
            hiddenNfts: config.hiddenNfts.filter(i => i !== address).concat(address)
        };

        await mutateAsync(config);
        sdk.topMessage(
            nft.collection?.address
                ? t('suspicious_status_update_hidden_collection')
                : t('suspicious_status_update_hidden_nft')
        );
    });
};

export const useMakeNftVisible = () => {
    const wallet = useActiveWallet();
    const sdk = useAppSdk();
    const { mutateAsync } = useMutateActiveWalletConfig();
    return useMutation<void, Error, NftWithCollectionId | string>(async nft => {
        let config = await getActiveWalletConfig(sdk.storage, wallet.rawAddress, wallet.network);

        const address = typeof nft === 'string' ? nft : nft.collection?.address || nft.address;

        config = {
            ...config,
            hiddenNfts: config.hiddenNfts.filter(item => item !== address)
        };

        await mutateAsync(config);
    });
};

export function useIsSpamNft(nft: (NftWithCollectionId & { trust: NFT['trust'] }) | undefined) {
    const { data: config } = useActiveWalletConfig();
    return isSpamNft(nft, config);
}

export function useIsUnverifiedNft(
    nft: (NftWithCollectionId & { trust: NFT['trust'] }) | undefined
) {
    const { data: config } = useActiveWalletConfig();
    return isUnverifiedNft(nft, config);
}

export const isSpamNft = (
    nft: (NftWithCollectionId & { trust: NFT['trust'] }) | undefined,
    config: ActiveWalletConfig | undefined
) => {
    return Boolean(
        nft &&
            (!!config?.spamNfts.includes(nft.collection?.address || nft.address) ||
                (nft.trust === 'blacklist' &&
                    !config?.trustedNfts.includes(nft.collection?.address || nft.address)))
    );
};

export const isUnverifiedNft = (
    nft: (NftWithCollectionId & { trust: NFT['trust'] }) | undefined,
    config: ActiveWalletConfig | undefined
) => {
    return Boolean(
        nft &&
            nft.trust !== 'whitelist' &&
            !config?.trustedNfts.includes(nft.collection?.address || nft.address)
    );
};
export const useWalletNftList = () => {
    const wallet = useActiveWallet();
    const {
        api: { tonApiV2 }
    } = useAppContext();

    return useQuery<NFT[], Error>(
        [wallet.rawAddress, QueryKey.nft],
        async () => {
            const { nftItems } = await new AccountsApi(tonApiV2).getAccountNftItems({
                accountId: wallet.rawAddress,
                offset: 0,
                limit: 1000,
                indirectOwnership: true
            });
            return nftItems;
        },
        {
            refetchInterval: DefaultRefetchInterval,
            refetchIntervalInBackground: true,
            refetchOnWindowFocus: true,
            keepPreviousData: true
        }
    );
};
export const useWalletFilteredNftList = () => {
    const { data: nfts, ...rest } = useWalletNftList();
    const { data: walletConfig } = useActiveWalletConfig();

    const filtered = useMemo(() => {
        if (!nfts || !walletConfig) return undefined;

        return nfts.filter(item => {
            const address = item.collection ? item.collection.address : item.address;

            if (isSpamNft(item, walletConfig)) {
                return false;
            }

            return !walletConfig?.hiddenNfts.includes(address);
        });
    }, [nfts, walletConfig?.trustedNfts, walletConfig?.spamNfts, walletConfig?.hiddenNfts]);

    return {
        data: filtered,
        ...rest
    };
};
export const useNftDNSLinkData = (nft: NFT) => {
    const {
        api: { tonApiV2 }
    } = useAppContext();

    return useQuery<DnsRecord | null, Error>(
        ['dns_link', nft?.address],
        async () => {
            const { dns: domainName } = nft;
            if (!domainName) return null;

            try {
                return await new DNSApi(tonApiV2).dnsResolve({ domainName });
            } catch (e) {
                return null;
            }
        },
        { enabled: nft.dns != null }
    );
};
const MINUTES_IN_YEAR = 60 * 60 * 24 * 366;
export const useNftDNSExpirationDate = (nft: NFT) => {
    const {
        api: { tonApiV2 }
    } = useAppContext();

    return useQuery<Date | null, Error>(['dns_expiring', nft.address], async () => {
        if (!nft.owner?.address || !nft.dns || !isTONDNSDomain(nft.dns)) {
            return null;
        }

        try {
            const result = await new BlockchainApi(tonApiV2).execGetMethodForBlockchainAccount({
                accountId: nft.address,
                methodName: 'get_last_fill_up_time'
            });

            const lastRefill = result?.decoded?.last_fill_up_time;
            if (lastRefill && typeof lastRefill === 'number' && isFinite(lastRefill)) {
                return new Date((lastRefill + MINUTES_IN_YEAR) * 1000);
            }

            return null;
        } catch (e) {
            return null;
        }
    });
};
export const useNftCollectionData = (nftOrCollection: NftItem | string) => {
    const {
        api: { tonApiV2 }
    } = useAppContext();

    const collectionAddress =
        typeof nftOrCollection === 'string' ? nftOrCollection : nftOrCollection.collection?.address;

    return useQuery<NftCollection | null, Error>(
        [collectionAddress, QueryKey.nftCollection],
        async () => {
            if (!collectionAddress) return null;

            return new NFTApi(tonApiV2).getNftCollection({
                accountId: collectionAddress
            });
        },
        { enabled: !!collectionAddress }
    );
};
export const useNftItemData = (address?: string) => {
    const {
        api: { tonApiV2 }
    } = useAppContext();

    return useQuery<NftItem, Error>(
        [address, QueryKey.nft],
        async () => {
            const result = await new NFTApi(tonApiV2).getNftItemByAddress({
                accountId: address!
            });
            return result;
        },
        { enabled: address !== undefined }
    );
};
