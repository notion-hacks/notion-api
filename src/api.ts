import * as _ from "lodash"
import * as got from "got"
import { CookieJar, Cookie } from "tough-cookie"
import * as FileCookieStore from "tough-cookie-store"
import * as path from "path"

const cookieStore = new FileCookieStore(
	path.resolve(__dirname, "../cookies.json"),
	{ encrypt: false }
)

const cookieJar = new CookieJar(cookieStore)

export async function notionApi(apiPath: string, args: object) {
	const response = await got("https://www.notion.so/api/v3" + apiPath, {
		method: "post",
		cookieJar,
		json: true,
		body: args,
	})
	return response
}

export async function getCurrentUserId() {
	const cookies = await new Promise<Array<Cookie>>((resolve, reject) => {
		cookieJar.getCookies("https://www.notion.so", (err, cookies) => {
			if (err) {
				reject(err)
			} else {
				resolve(cookies)
			}
		})
	})
	const userIdCookie = cookies.find(cookie => cookie.key === "userId")
	if (!userIdCookie) {
		throw new Error("User not found. Please login.")
	}
	return userIdCookie.value
}

export type Role = "reader" | "comment_only" | "read_and_write" | "editor"

export type Permission =
	| { type: "space_permission"; role: Role }
	| { type: "user_permission"; role: Role; user_id: string }

export type Schema = {
	user_root: {
		id: string
		space_views?: Array<string>
	}
	notion_user: {
		id: string
		email: string
		given_name?: Array<string>
	}
	space_view: {
		id: string
		space_id: string
		bookmarked_pages?: Array<string>
		shared_pages?: Array<string>
	}
	space: {
		id: string
		name: string
		pages?: Array<string>
	}
	block: {
		id: string
		type: string
		permissions?: Array<Permission>
	}
}

export async function getRecordValues(
	args: Array<{
		table: keyof Schema
		id: string
	}>
): Promise<Array<{ role: Role; value: any }> | undefined> {
	const response = await notionApi("/getRecordValues", { requests: args })
	if (response.statusCode === 200) {
		return response.body.results
	}
}

// TODO: batch these together to call getRecordValues more efficiently.
export async function getRecordValue<T extends keyof Schema>(args: {
	table: T
	id: string
}): Promise<{ role: Role; value: Schema[T] | undefined } | undefined> {
	const result = await getRecordValues([args])
	if (result) {
		return result[0]
	}
}

export async function getSpaces(userId: string) {
	const userRoot = await getRecordValue({ table: "user_root", id: userId })
	if (!userRoot) {
		throw new Error("Could not find userRoot for userId: " + userId)
	}
	if (!userRoot.value) {
		throw new Error("No permissions for userRoot: " + userId)
	}

	const spaceViewIds = userRoot.value.space_views || []
	const spaces = _.compact(
		await Promise.all(
			spaceViewIds.map(async spaceViewId => {
				const spaceView = await getRecordValue({
					table: "space_view",
					id: spaceViewId,
				})
				if (!spaceView) {
					return
				}
				if (!spaceView.value) {
					return
				}
				const space = await getRecordValue({
					table: "space",
					id: spaceView.value.space_id,
				})
				if (!space) {
					return
				}

				const spaceDataResponse = await notionApi("/getPublicSpaceData", {
					spaceIds: [spaceView.value.space_id],
				})
				let spaceData:
					| { name?: string; domain?: string; icon?: string }
					| undefined
				if (spaceDataResponse.statusCode === 200) {
					spaceData = spaceDataResponse.body.results[0]
				}

				return { spaceView: spaceView.value, space: space.value, spaceData }
			})
		)
	)

	return spaces
}

export async function getSidebar(userId: string, spaceId: string) {
	const spaces = await getSpaces(userId)
	const result = spaces.find(({ spaceView }) => spaceView.space_id === spaceId)
	if (!result) {
		throw new Error("Could not find space: " + spaceId)
	}
	const { space, spaceView } = result

	const favoritePageIds = spaceView.bookmarked_pages || []
	const sharedPageIds = spaceView.shared_pages || []
	const spacePageIds = (space && space.pages) || []
	const allPageIds = _.uniq([
		...favoritePageIds,
		...sharedPageIds,
		...spacePageIds,
	])

	const results = await getRecordValues(
		allPageIds.map(id => ({ table: "block", id }))
	)

	const pages: Array<Schema["block"]> = (results || [])
		.filter(result => result.value)
		.map(result => result.value)

	const favoritePages = _.compact(
		favoritePageIds.map(pageId => pages.find(page => page.id === pageId))
	)

	const sharedPages = _.compact(
		sharedPageIds.map(pageId => pages.find(page => page.id === pageId))
	)

	const workspacePages: Array<Schema["block"]> = []
	const privatePages: Array<Schema["block"]> = []

	for (const pageId of spacePageIds) {
		const page = pages.find(page => page.id === pageId)
		if (!page) {
			continue
		}
		if (!page.permissions) {
			return
		}
		const spacePermission = page.permissions.find(
			permission => permission.type === "space_permission"
		)
		if (spacePermission) {
			workspacePages.push(page)
			continue
		}
		const userPermission = page.permissions.find(
			permission =>
				permission.type === "user_permission" &&
				permission.user_id === userId &&
				permission.role === "editor"
		)
		if (userPermission) {
			privatePages.push(page)
			continue
		}
	}

	return {
		favorites: favoritePages,
		workspace: workspacePages,
		shared: sharedPages,
		private: privatePages,
	}
}

export async function setBlockTitle(args: { blockId: string; title: string }) {
	await notionApi("/submitTransaction", {
		operations: [
			{
				id: args.blockId,
				table: "block",
				path: ["properties", "title"],
				command: "set",
				args: [[args.title]],
			},
		],
	})
}
