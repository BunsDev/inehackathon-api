import createError from 'http-errors';
import slugify from 'slugify';

import { PrimateService, prisma } from '@thewebchimp/primate';

class ElementService {

	static checkElementExists(name) {
		return prisma.element.findFirst({
			where: {
				name,
			},
		});
	}

	// mergeElements
	static async mergeElements(user, data) {
		const { element1, element2 } = data;

		// if there is no element1 or element2
		if(!element1 || !element2) {
			throw createError.BadRequest('Both elements are required');
		}

		// check that both elements exist
		const element1Exists = await prisma.element.findFirst({
			where: {
				name: element1,
			},
		});

		const element2Exists = await prisma.element.findFirst({
			where: {
				name: element2,
			},
		});

		if(!element1Exists) {
			throw createError.BadRequest(`Element 1: ${ element1 } does not exist`);
		}

		if(!element2Exists) {
			throw createError.BadRequest(`Element 2: ${ element2 } does not exist`);
		}

		// Check if the combination exists in the elements table
		const combinationExists = await prisma.element.findFirst({
			where: {
				OR: [
					{
						parent1: element1,
						parent2: element2,
					},
					{
						parent1: element2,
						parent2: element1,
					},
				],
			},
		});

		// if the combination exists, return the result
		if(combinationExists) {

			// add the element to the user
			await prisma.user.update({
				where: {
					id: user.id,
				},
				data: {
					elements: {
						connect: {
							id: combinationExists.id,
						},
					},
				},
			});

			return {
				type: 'element',
				element1: combinationExists.parent1,
				element2: combinationExists.parent2,
				result: combinationExists.name,
				description: combinationExists.description,
				reasoning: combinationExists.reasoning,
			};
		}

		// If both elements exist, check if the combination already exists (element1 + element2) or (element2 + element1)
		const recipeExists = await prisma.recipe.findFirst({
			where: {
				OR: [
					{
						element1: element1,
						element2: element2,
					},
					{
						element1: element2,
						element2: element1,
					},
				],
			},
		});

		// The elements do not exist, so we can check the recipes
		// if the recipe exists
		if(recipeExists) {

			// Create the new element
			const newElement = await prisma.element.create({
				data: {
					idParent1: element1Exists.id,
					idParent2: element2Exists.id,
					idUserFirstDiscovery: user.id,
					name: recipeExists.result,
					slug: slugify(recipeExists.result, { lower: true }),
					parent1: recipeExists.element1,
					parent2: recipeExists.element2,
					description: recipeExists.description,
					reasoning: recipeExists.reasoning,
					source: 'recipe',
				},
			});

			// add the element to the user
			await prisma.user.update({
				where: {
					id: user.id,
				},
				data: {
					elements: {
						connect: {
							id: newElement.id,
						},
					},
				},
			});

			return {
				type: 'recipe',
				element1: recipeExists.element1,
				element2: recipeExists.element2,
				result: recipeExists.result,
				description: recipeExists.description,
				reasoning: recipeExists.reasoning,
			};
		} else {

			// If the recipe does not exist, get it via AI
			const systemPrompt = 'You are an agent working for an Alchemy Game.' +
				'An alchemy game is a game where you can mix two elements to create a new one. ' +
				'You will receive two words or terms and return a new one, Some examples:' +
				'\n\nFire + Water = Steam\n' +
				'Water + Water = River\n' +
				'Fire + Earth = Volcano\n' +
				'Earth + Water = Mud\n' +
				'Mud + Fire = Clay\n' +
				'The result should be a logical conclusion.\n\n' +
				'It\s important to generate life and fun elements, so the user can continue playing the game. ' +
				'Consider that the order of the elements IS important so for example:' +
				'Earth + Water = Mud is different from Water + Earth = Plant\n\n' +
				'Your results will include categories like: ' +
				'Elements, Animals, Plants, Objects, Monsters, Games, Famous People, Historical Events, Historical Figures, Brands, etc.\n\n' +
				'Return a Json (only the JSON, nothing else) with the following schema:\n\n' +
				'{\n' +
				'    element1: [whatever],\n' +
				'    element2: [whatever],\n' +
				'    result: [result],\n' +
				'    category: [give a category that makes sense],\n' +
				'    description: [a little description on the element created],\n' +
				'    reasoning: [a little reasoning on why this combination works]\n' +
				'}\n\n' +
				'The term resulting term should be written properly as a title. ' +
				'Try giving existing things instead of inventing new ones when possible.' +
				'Also, try to create elements that are useful for the game, so the user can continue creating new elements.\n\n' +
				'Merge the concepts instead of the literal meaning.';

			// fetch https://llm.ag1.tech/stream with the systemPrompt, via post
			const res = await fetch('https://llm.ag1.tech/stream', {
				method: 'POST',
				body: JSON.stringify({
					system: systemPrompt,
					prompt: element1 + ' + ' + element2,
					stream: false,
					model: 'gpt-4',
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if(!res.ok) {
				throw createError.InternalServerError('Error fetching the AI');
			}

			const aiData = await res.json();

			try {
				const aiElement = JSON.parse(aiData.choices[0].message.content);

				console.log('AI ELEMENT', aiElement);

				// check if what AI said already exists
				const elementExists = await prisma.element.findFirst({
					where: {
						name: aiElement.result,
					},
				});

				// if it exists, save the recipe and return the existing element
				if(elementExists) {
					await prisma.recipe.create({
						data: {
							element1: element1,
							element2: element2,
							result: aiElement.result,
							description: aiElement.description,
							reasoning: aiElement.reasoning,
						},
					});

					// add the element to the user
					await prisma.user.update({
						where: {
							id: user.id,
						},
						data: {
							elements: {
								connect: {
									id: elementExists.id,
								},
							},
						},
					});

					return {
						type: 'element',
						element1: element1,
						element2: element2,
						result: aiElement.result,
						description: aiElement.description,
						reasoning: aiElement.reasoning,
					};
				}

				// Create the new element
				const newElement = await prisma.element.create({
					data: {
						idParent1: element1Exists.id,
						idParent2: element2Exists.id,
						idUserFirstDiscovery: user.id,
						name: aiElement.result,
						slug: slugify(aiElement.result, { lower: true }),
						parent1: aiElement.element1,
						parent2: aiElement.element2,
						description: aiElement.description,
						reasoning: aiElement.reasoning,
						source: 'ai',
					},
				});

				// add the element to the user
				await prisma.user.update({
					where: {
						id: user.id,
					},
					data: {
						elements: {
							connect: {
								id: newElement.id,
							},
						},
					},
				});

				return {
					type: 'ai',
					element1: aiElement.element1,
					element2: aiElement.element2,
					result: aiElement.result,
					description: aiElement.description,
					reasoning: aiElement.reasoning,
				};

			} catch(e) {
				throw createError.InternalServerError('Error parsing the AI response:' + e.message);
			}
		}
	}
}

export default ElementService;