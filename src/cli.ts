import * as yargs from "yargs"
import * as util from "util"

function help() {
	console.log(
		[
			"",
			"notion-api <command>",
			"",
			" login                           Log in to Notion",
			" user                            Get information about the logged in user",
			" spaces                          Get the user's spaces along with related information",
			" sidebar <spaceId>               Get a list of pages in the sidebar for a given space",
			" get <table> <id>                Get a record from Notion",
			" set-title <blockId> <title>     Set a block title",
			"",
		].join("\n")
	)
}

function log(obj: any) {
	console.log(util.inspect(obj, false, null, true))
}

async function main() {
	const args = yargs.argv._
	const options = yargs.argv

	if (args[0] === "login") {
		const { login } = await import("./login")
		await login()
		return
	}

	if (args[0] === "userId") {
		const { getCurrentUserId } = await import("./api")
		const userId = await getCurrentUserId()
		log(userId)
		return
	}

	if (args[0] === "user") {
		const { getCurrentUserId, getRecordValue } = await import("./api")
		const userId = await getCurrentUserId()
		const user = await getRecordValue({ table: "notion_user", id: userId })
		log(user && user.value)
		return
	}

	if (args[0] === "spaces") {
		const { getCurrentUserId, getSpaces } = await import("./api")
		const userId = await getCurrentUserId()
		const spaces = await getSpaces(userId)
		log(spaces)
		return
	}

	if (args[0] === "sidebar") {
		const spaceId = args[1]
		if (!spaceId) {
			throw new Error("Missing spaceId argument.")
		}
		const { getCurrentUserId, getSidebar } = await import("./api")
		const userId = await getCurrentUserId()
		const spaces = await getSidebar(userId, spaceId)
		log(spaces)
		return
	}

	if (args[0] === "get") {
		const table: any = args[1]
		if (!table) {
			throw new Error("Missing table argument.")
		}
		const id = args[2]
		if (!id) {
			throw new Error("Missing id argument.")
		}
		const { getRecordValue } = await import("./api")
		const result = await getRecordValue({ table, id })
		log(result && result.value)
		return
	}

	if (args[0] === "set-title") {
		const blockId: any = args[1]
		if (!blockId) {
			throw new Error("Missing blockId argument.")
		}
		const title = args[2]
		if (!title) {
			throw new Error("Missing title argument.")
		}
		const { setBlockTitle } = await import("./api")
		await setBlockTitle({ blockId, title })
		return
	}

	help()
}

main().catch(error => {
	console.error(error)
	process.exit(1)
})
