/* tslint:disable */
/* eslint-disable */
/**
 * REST api to TON blockchain explorer
 * Provide access to indexed TON blockchain
 *
 * The version of the OpenAPI document: 2.0.0
 * Contact: support@tonkeeper.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * Minting fees of new currencies.
 * @export
 * @interface BlockchainConfig6
 */
export interface BlockchainConfig6 {
    /**
     * 
     * @type {number}
     * @memberof BlockchainConfig6
     */
    mintNewPrice: number;
    /**
     * 
     * @type {number}
     * @memberof BlockchainConfig6
     */
    mintAddPrice: number;
}

/**
 * Check if a given object implements the BlockchainConfig6 interface.
 */
export function instanceOfBlockchainConfig6(value: object): boolean {
    if (!('mintNewPrice' in value)) return false;
    if (!('mintAddPrice' in value)) return false;
    return true;
}

export function BlockchainConfig6FromJSON(json: any): BlockchainConfig6 {
    return BlockchainConfig6FromJSONTyped(json, false);
}

export function BlockchainConfig6FromJSONTyped(json: any, ignoreDiscriminator: boolean): BlockchainConfig6 {
    if (json == null) {
        return json;
    }
    return {
        
        'mintNewPrice': json['mint_new_price'],
        'mintAddPrice': json['mint_add_price'],
    };
}

export function BlockchainConfig6ToJSON(value?: BlockchainConfig6 | null): any {
    if (value == null) {
        return value;
    }
    return {
        
        'mint_new_price': value['mintNewPrice'],
        'mint_add_price': value['mintAddPrice'],
    };
}
