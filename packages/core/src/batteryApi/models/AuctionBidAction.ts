/* tslint:disable */
/* eslint-disable */
/**
 * Custodial-Battery REST API.
 * REST API for Custodial Battery which provides gas to different networks to help execute transactions.
 *
 * The version of the OpenAPI document: 0.0.1
 * Contact: support@tonkeeper.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
import type { Price } from './Price';
import {
    PriceFromJSON,
    PriceFromJSONTyped,
    PriceToJSON,
    PriceToJSONTyped,
} from './Price';
import type { NftItem } from './NftItem';
import {
    NftItemFromJSON,
    NftItemFromJSONTyped,
    NftItemToJSON,
    NftItemToJSONTyped,
} from './NftItem';
import type { AccountAddress } from './AccountAddress';
import {
    AccountAddressFromJSON,
    AccountAddressFromJSONTyped,
    AccountAddressToJSON,
    AccountAddressToJSONTyped,
} from './AccountAddress';

/**
 * 
 * @export
 * @interface AuctionBidAction
 */
export interface AuctionBidAction {
    /**
     * 
     * @type {string}
     * @memberof AuctionBidAction
     */
    auctionType: AuctionBidActionAuctionTypeEnum;
    /**
     * 
     * @type {Price}
     * @memberof AuctionBidAction
     */
    amount: Price;
    /**
     * 
     * @type {NftItem}
     * @memberof AuctionBidAction
     */
    nft?: NftItem;
    /**
     * 
     * @type {AccountAddress}
     * @memberof AuctionBidAction
     */
    bidder: AccountAddress;
    /**
     * 
     * @type {AccountAddress}
     * @memberof AuctionBidAction
     */
    auction: AccountAddress;
}


/**
 * @export
 */
export const AuctionBidActionAuctionTypeEnum = {
    DnsTon: 'DNS.ton',
    DnsTg: 'DNS.tg',
    NumberTg: 'NUMBER.tg',
    Getgems: 'getgems'
} as const;
export type AuctionBidActionAuctionTypeEnum = typeof AuctionBidActionAuctionTypeEnum[keyof typeof AuctionBidActionAuctionTypeEnum];


/**
 * Check if a given object implements the AuctionBidAction interface.
 */
export function instanceOfAuctionBidAction(value: object): value is AuctionBidAction {
    if (!('auctionType' in value) || value['auctionType'] === undefined) return false;
    if (!('amount' in value) || value['amount'] === undefined) return false;
    if (!('bidder' in value) || value['bidder'] === undefined) return false;
    if (!('auction' in value) || value['auction'] === undefined) return false;
    return true;
}

export function AuctionBidActionFromJSON(json: any): AuctionBidAction {
    return AuctionBidActionFromJSONTyped(json, false);
}

export function AuctionBidActionFromJSONTyped(json: any, ignoreDiscriminator: boolean): AuctionBidAction {
    if (json == null) {
        return json;
    }
    return {
        
        'auctionType': json['auction_type'],
        'amount': PriceFromJSON(json['amount']),
        'nft': json['nft'] == null ? undefined : NftItemFromJSON(json['nft']),
        'bidder': AccountAddressFromJSON(json['bidder']),
        'auction': AccountAddressFromJSON(json['auction']),
    };
}

  export function AuctionBidActionToJSON(json: any): AuctionBidAction {
      return AuctionBidActionToJSONTyped(json, false);
  }

  export function AuctionBidActionToJSONTyped(value?: AuctionBidAction | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'auction_type': value['auctionType'],
        'amount': PriceToJSON(value['amount']),
        'nft': NftItemToJSON(value['nft']),
        'bidder': AccountAddressToJSON(value['bidder']),
        'auction': AccountAddressToJSON(value['auction']),
    };
}
