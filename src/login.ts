export async function login() {
	const inquirer = await import("inquirer")
	const { default: ora } = await import("ora")
	const { notionApi } = await import("./api")

	const prompt = inquirer.createPromptModule()
	const { email } = await prompt([
		{
			type: "input",
			name: "email",
			message: "Email:",
		},
	])

	const sendTemporaryPasswordSpinner = ora("Sending temporary password").start()

	const sendTemporaryPasswordResponse = await notionApi(
		"/sendTemporaryPassword",
		{
			email: email,
			isSignup: false,
		}
	)

	if (sendTemporaryPasswordResponse.statusCode !== 200) {
		sendTemporaryPasswordSpinner.fail(
			"Sending temporary password: " + sendTemporaryPasswordResponse.body
		)
		return
	}

	sendTemporaryPasswordSpinner.succeed()

	const { csrfState } = sendTemporaryPasswordResponse.body

	const { password } = await prompt([
		{
			type: "input",
			name: "password",
			message: "Password:",
		},
	])

	const loginWithEmailSpinner = ora("Logging in").start()

	const loginWithEmailResponse = await notionApi("/loginWithEmail", {
		state: csrfState,
		password: password,
	})

	if (loginWithEmailResponse.statusCode !== 200) {
		loginWithEmailSpinner.fail("Logging in: " + loginWithEmailResponse.body)
		return
	}

	loginWithEmailSpinner.succeed()
}
