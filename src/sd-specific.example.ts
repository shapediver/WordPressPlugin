import {
	QUERYPARAM_MODELSTATEID,
	QUERYPARAM_SETTINGSURL,
} from "@AppBuilderShared/types/shapediver/queryparams";
import {IAppBuilderUrlBuilderData} from "@AppBuilderShared/utils/urlbuilder";
import {
	IAddItemToCartData,
	IAddItemToCartReply,
	IECommerceApiActions,
	IGetParentPageInfoReply,
	IGetUserProfileReply,
	IMessageToParentData,
	IMessageToParentReply,
	IScrollingApiLoadMoreData,
	IScrollingApiLoadMoreReply,
	IScrollingApiSetParametersData,
	IScrollingApiSetParametersReply,
	IUpdateSharingLinkData,
	IUpdateSharingLinkReply,
} from "./shared/modules/ecommerce/types/ecommerceapi";

/**
 * This file contains an example override implementation of IECommerceApiAction
 * for the App Builder iframe. If you need specific actions to be implemented
 * for your WordPress setup, this is a good starting point. Rename this file
 * to sd-specific.ts and implement your custom actions. Then build the plugin.
 */

/**
 * Specific implementation of IECommerceApiActions for the App Builder iframe.
 * This can be used to override the default actions.
 */
class SpecificECommerceApiActions implements IECommerceApiActions {
	constructor(private defaultActions?: IECommerceApiActions) {}

	getParentPageInfo(): Promise<IGetParentPageInfoReply> {
		// remove the following line if you want to implement a custom action
		if (this.defaultActions) return this.defaultActions.getParentPageInfo();

		return Promise.reject("Not implemented");
	}

	closeConfigurator(): Promise<boolean> {
		// remove the following line if you want to implement a custom action
		if (this.defaultActions) return this.defaultActions.closeConfigurator();

		return Promise.reject("Not implemented");
	}

	addItemToCart(data: IAddItemToCartData): Promise<IAddItemToCartReply> {
		// remove the following line if you want to implement a custom action
		if (this.defaultActions) return this.defaultActions.addItemToCart(data);

		return Promise.reject("Not implemented");
	}

	getUserProfile(): Promise<IGetUserProfileReply> {
		// remove the following line if you want to implement a custom action
		if (this.defaultActions) return this.defaultActions.getUserProfile();

		return Promise.reject("Not implemented");
	}

	updateSharingLink(
		data: IUpdateSharingLinkData,
	): Promise<IUpdateSharingLinkReply> {
		// remove the following line if you want to implement a custom action
		if (this.defaultActions)
			return this.defaultActions.updateSharingLink(data);

		return Promise.reject("Not implemented");
	}

	async scrollingApiSetParameters(
		data: IScrollingApiSetParametersData,
	): Promise<IScrollingApiSetParametersReply<unknown>> {
		// remove the following line if you want to implement a custom action
		if (this.defaultActions)
			return this.defaultActions.scrollingApiSetParameters(data);

		return Promise.reject("Not implemented");
	}

	async scrollingApiLoadMore(
		data: IScrollingApiLoadMoreData,
	): Promise<IScrollingApiLoadMoreReply<unknown>> {
		// remove the following line if you want to implement a custom action
		if (this.defaultActions)
			return this.defaultActions.scrollingApiLoadMore(data);

		return Promise.reject("Not implemented");
	}

	messageToParent(
		data: IMessageToParentData,
	): Promise<IMessageToParentReply> {
		if (this.defaultActions)
			return this.defaultActions.messageToParent(data);

		return Promise.reject("Not implemented");
	}
}

(globalThis as {[key: string]: any}).specificECommerceApiActions =
	new SpecificECommerceApiActions();

const urlParams = new URLSearchParams(window.location.search);

/**
 * URL builder options for local development environment.
 */
export const developmentUrlBuilderOptions: IAppBuilderUrlBuilderData = {
	baseUrl: `https://appbuilder.shapediver.com/v1/main/${urlParams.get("appBuilderVersion") ?? "development"}/`,
	settingsUrl: urlParams.get(QUERYPARAM_SETTINGSURL) ?? undefined,
	modelStateId: urlParams.get(QUERYPARAM_MODELSTATEID) ?? undefined,
};

(globalThis as {[key: string]: any}).developmentUrlBuilderOptions =
	developmentUrlBuilderOptions;
