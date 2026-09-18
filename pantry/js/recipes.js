/* Recipes a home cook can actually make on a weeknight. Ingredients are food
   ids from foods.js; `opt` marks the ones a recipe survives without. Times are
   minutes from cupboard to plate, servings are generous adult portions. */

const R = (id, name, meta, ingredients, steps) => ({ id, name, ...meta, ingredients, steps });
const need = (food, amount) => ({ food, amount });
const opt = (food, amount) => ({ food, amount, opt: true });

export const RECIPES = [
  R('tomato_pasta', 'Weeknight tomato pasta', { time: 25, serves: 4, tags: ['vegetarian', 'quick'] }, [
    need('pasta', '400 g'), need('canned_tomato', '1 can (400 g)'), need('garlic', '3 cloves'), need('onion', '1'),
    need('olive_oil', '2 tbsp'), opt('parmesan', 'to serve'), opt('basil', 'a handful'), opt('chili_powder', 'a pinch'),
  ], [
    'Boil a large pan of salted water and cook the pasta until just tender.',
    'Meanwhile soften the diced onion in the oil over medium heat for 6–8 minutes, then add the sliced garlic for a minute more.',
    'Tip in the tomatoes, season, and simmer 10 minutes until thick. Add a pinch of chili if you like heat.',
    'Toss the drained pasta through the sauce with a splash of pasta water. Finish with basil and parmesan.',
  ]),
  R('fried_rice', 'Egg fried rice', { time: 20, serves: 2, tags: ['quick', 'uses leftovers'] }, [
    need('rice', '300 g cooked (or 150 g raw)'), need('egg', '2'), need('soy_sauce', '2 tbsp'), need('vegetable_oil', '2 tbsp'),
    need('garlic', '2 cloves'), opt('spring_onion', '3'), opt('peas', '100 g'), opt('carrot', '1'), opt('sesame_oil', '1 tsp'), opt('ginger', '1 thumb'),
  ], [
    'Cook and cool the rice if you have none left over; day-old rice fries best.',
    'Heat the oil in a wok until it shimmers. Fry the garlic (and ginger) for 30 seconds, then add any diced carrot and peas for 2 minutes.',
    'Add the rice and toss until every grain is hot and starting to catch.',
    'Push the rice to one side, crack in the eggs, scramble, then fold through. Season with soy and sesame oil and scatter with spring onion.',
  ]),
  R('omelette', 'Cheese omelette', { time: 10, serves: 1, tags: ['vegetarian', 'quick', 'breakfast'] }, [
    need('egg', '3'), need('butter', '1 tbsp'), need('cheddar', '40 g'), opt('spring_onion', '1'), opt('ham', '1 slice'), opt('mushroom', '3'), opt('parsley', 'a little'),
  ], [
    'Beat the eggs with salt and pepper until just combined.',
    'Melt the butter in a non-stick pan over medium-high heat until foaming. Fry any mushroom or ham first.',
    'Pour in the eggs, and as they set drag the edges to the middle so raw egg runs underneath.',
    'When the top is barely set, scatter over the cheese, fold in half, and slide onto a plate.',
  ]),
  R('chicken_stir_fry', 'Chicken and vegetable stir-fry', { time: 25, serves: 3, tags: ['quick'] }, [
    need('chicken_breast', '400 g'), need('soy_sauce', '3 tbsp'), need('garlic', '2 cloves'), need('vegetable_oil', '2 tbsp'),
    need('bell_pepper', '1'), opt('broccoli', '1 small head'), opt('ginger', '1 thumb'), opt('honey', '1 tbsp'), opt('rice', 'to serve'), opt('noodles', 'to serve'), opt('cornflour', '1 tsp'),
  ], [
    'Slice the chicken thinly and toss with a tablespoon of soy and the cornstarch.',
    'Get a wok very hot. Sear the chicken in half the oil until golden; set aside.',
    'Stir-fry the sliced pepper, broccoli, garlic and ginger in the remaining oil for 3 minutes.',
    'Return the chicken, add the rest of the soy, honey and a splash of water, and toss until glossy. Serve over rice or noodles.',
  ]),
  R('chili', 'Chili con carne', { time: 50, serves: 6, tags: ['batch cook', 'freezes well'] }, [
    need('ground_beef', '500 g'), need('onion', '1'), need('garlic', '3 cloves'), need('canned_tomato', '2 cans'), need('kidney_beans', '1 can'),
    need('cumin', '2 tsp'), need('chili_powder', '1–2 tsp'), need('paprika', '1 tsp'), opt('bell_pepper', '1'), opt('tomato_paste', '1 tbsp'), opt('rice', 'to serve'), opt('sour_cream', 'to serve'), opt('cheddar', 'to serve'), opt('cilantro', 'to serve'),
  ], [
    'Brown the beef hard in a wide pan, breaking it up, until the liquid has cooked off and it is catching. Set aside.',
    'Soften the onion and pepper in the fat, then add garlic, cumin, chili and paprika for a minute.',
    'Return the beef with the tomatoes and tomato paste. Simmer 30 minutes, lid off, until thick.',
    'Stir in the drained beans and simmer 10 minutes more. Serve with rice, sour cream, cheese and cilantro.',
  ]),
  R('dal', 'Red lentil dal', { time: 35, serves: 4, tags: ['vegan', 'cheap', 'batch cook'] }, [
    need('lentils', '250 g red'), need('onion', '1'), need('garlic', '3 cloves'), need('turmeric', '1 tsp'), need('cumin', '1 tsp'),
    need('vegetable_oil', '2 tbsp'), opt('ginger', '1 thumb'), opt('canned_tomato', '1 can'), opt('chili', '1'), opt('coconut_milk', '200 ml'), opt('cilantro', 'a handful'), opt('rice', 'to serve'), opt('lemon', '1/2'),
  ], [
    'Rinse the lentils and simmer them in 750 ml water with the turmeric until soft and collapsing, about 20 minutes.',
    'Meanwhile fry the sliced onion in the oil until deep golden. Add garlic, ginger, chili and cumin for a minute.',
    'Stir the onion mixture, tomatoes and coconut milk into the lentils and simmer 5 minutes. Season well.',
    'Finish with lemon and cilantro. Serve with rice or flatbread.',
  ]),
  R('shakshuka', 'Shakshuka', { time: 25, serves: 2, tags: ['vegetarian', 'brunch', 'one pan'] }, [
    need('egg', '4'), need('canned_tomato', '1 can'), need('onion', '1'), need('bell_pepper', '1'), need('garlic', '2 cloves'),
    need('cumin', '1 tsp'), need('paprika', '1 tsp'), need('olive_oil', '2 tbsp'), opt('feta', '50 g'), opt('bread', 'to serve'), opt('parsley', 'a handful'), opt('chili_powder', 'a pinch'),
  ], [
    'Soften the sliced onion and pepper in the oil for 10 minutes, then add garlic and spices for a minute.',
    'Pour in the tomatoes and simmer until thick, about 8 minutes. Season.',
    'Make four wells and crack an egg into each. Cover and cook 5–7 minutes until the whites set and the yolks are still soft.',
    'Crumble over feta and parsley and eat straight from the pan with bread.',
  ]),
  R('grilled_cheese', 'Grilled cheese', { time: 10, serves: 1, tags: ['vegetarian', 'quick'] }, [
    need('bread', '2 slices'), need('cheddar', '60 g'), need('butter', '1 tbsp'), opt('tomato', '1'), opt('ham', '1 slice'), opt('mustard', '1 tsp'),
  ], [
    'Butter the outside of both slices. Spread mustard inside if using.',
    'Fill with cheese and any tomato or ham. Cook in a pan over medium-low heat, pressing gently, until deep gold on both sides and the cheese runs.',
  ]),
  R('carbonara', 'Spaghetti carbonara', { time: 20, serves: 2, tags: ['quick'] }, [
    need('pasta', '200 g spaghetti'), need('bacon', '100 g'), need('egg', '2 + 1 yolk'), need('parmesan', '50 g'), need('black_pepper', 'plenty'), opt('garlic', '1 clove'),
  ], [
    'Cook the spaghetti in well-salted water. Meanwhile fry the bacon (and a whole crushed garlic clove) until crisp; discard the garlic.',
    'Beat the eggs, yolk, grated parmesan and lots of pepper in a bowl.',
    'Drain the pasta, keeping a mug of water. Off the heat, toss the pasta with the bacon, then the egg mixture, adding pasta water until silky. Never return it to direct heat.',
  ]),
  R('chicken_curry', 'Easy chicken curry', { time: 40, serves: 4, tags: ['freezes well'] }, [
    need('chicken_thigh', '600 g'), need('onion', '2'), need('garlic', '3 cloves'), need('ginger', '1 thumb'), need('curry_powder', '2 tbsp'),
    need('canned_tomato', '1 can'), need('vegetable_oil', '2 tbsp'), opt('coconut_milk', '200 ml'), opt('yogurt', '3 tbsp'), opt('cilantro', 'a handful'), opt('rice', 'to serve'), opt('spinach', '100 g'),
  ], [
    'Fry the sliced onions in the oil until soft and golden, 10 minutes. Add garlic, ginger and curry powder for a minute.',
    'Add the chicken, cut into chunks, and coat in the spices. Pour in the tomatoes and coconut milk and simmer 20 minutes.',
    'Stir in spinach or yogurt at the end and check the seasoning. Serve with rice and cilantro.',
  ]),
  R('thai_curry', 'Thai coconut curry', { time: 30, serves: 3, tags: ['quick'] }, [
    need('curry_paste', '2 tbsp'), need('coconut_milk', '1 can'), need('vegetable_oil', '1 tbsp'), need('rice', 'to serve'),
    opt('chicken_breast', '400 g'), opt('tofu', '300 g'), opt('shrimp', '300 g'), opt('bell_pepper', '1'), opt('green_beans', '150 g'), opt('fish_sauce', '1 tbsp'), opt('lime', '1'), opt('basil', 'a handful'), opt('sugar', '1 tsp'),
  ], [
    'Fry the curry paste in the oil for a minute until fragrant. Add a splash of coconut milk and let it split and sizzle.',
    'Add your protein of choice and cook 3 minutes, then the rest of the coconut milk and the vegetables. Simmer 10 minutes.',
    'Season with fish sauce, sugar and lime juice. Finish with basil and serve over rice.',
  ]),
  R('roast_veg', 'Tray of roasted vegetables', { time: 45, serves: 4, tags: ['vegan', 'side', 'one pan'] }, [
    need('olive_oil', '3 tbsp'), opt('potato', '500 g'), opt('sweet_potato', '2'), opt('carrot', '3'), opt('bell_pepper', '2'), opt('zucchini', '1'), opt('onion', '2'), opt('eggplant', '1'), opt('garlic', '4 cloves'), opt('rosemary', '2 sprigs'), opt('oregano', '1 tsp'), opt('feta', '100 g'),
  ], [
    'Heat the oven to 220°C / 425°F. Cut whatever vegetables you have into even chunks; root vegetables smaller than soft ones.',
    'Toss with the oil, salt, pepper and herbs on a large tray, keeping them in one layer.',
    'Roast 35–40 minutes, turning once, until caramelised at the edges. Crumble feta over to serve.',
  ]),
  R('tuna_pasta', 'Tuna and lemon pasta', { time: 20, serves: 2, tags: ['quick', 'cheap', 'pantry'] }, [
    need('pasta', '200 g'), need('tuna', '1 can'), need('lemon', '1'), need('olive_oil', '3 tbsp'), need('garlic', '2 cloves'),
    opt('capers', '1 tbsp'), opt('parsley', 'a handful'), opt('chili_powder', 'a pinch'), opt('olives', 'a handful'), opt('peas', '100 g'),
  ], [
    'Cook the pasta, adding the peas for the last 3 minutes.',
    'Warm the oil with the sliced garlic and chili until fragrant, not browned. Stir in drained tuna, capers, olives and lemon zest.',
    'Toss with the drained pasta, lemon juice, parsley and a splash of pasta water.',
  ]),
  R('bean_burrito', 'Black bean burritos', { time: 20, serves: 4, tags: ['vegetarian', 'quick', 'cheap'] }, [
    need('tortilla', '4 large'), need('black_beans', '1 can'), need('cumin', '1 tsp'), need('onion', '1'), need('cheddar', '100 g'),
    opt('rice', '200 g cooked'), opt('salsa', '4 tbsp'), opt('avocado', '1'), opt('lime', '1'), opt('cilantro', 'a handful'), opt('sour_cream', '4 tbsp'), opt('lettuce', 'a handful'), opt('hot_sauce', 'to taste'),
  ], [
    'Fry the diced onion until soft, add cumin and the drained beans and mash roughly with a splash of water. Season and add lime.',
    'Warm the tortillas. Fill with beans, rice, cheese, salsa, avocado and anything else, fold the sides in and roll tightly.',
    'Toast the burritos seam-side down in a dry pan for a minute to seal.',
  ]),
  R('tacos', 'Beef tacos', { time: 25, serves: 4, tags: ['quick'] }, [
    need('ground_beef', '500 g'), need('tortilla', '8 small'), need('onion', '1'), need('cumin', '2 tsp'), need('paprika', '1 tsp'), need('chili_powder', '1 tsp'),
    opt('garlic', '2 cloves'), opt('tomato', '2'), opt('lettuce', 'a handful'), opt('cheddar', '100 g'), opt('lime', '1'), opt('cilantro', 'a handful'), opt('sour_cream', 'to serve'), opt('avocado', '1'),
  ], [
    'Brown the beef with the diced onion, then add garlic and spices and cook 2 minutes. Season and add a splash of water to loosen.',
    'Warm the tortillas in a dry pan. Chop tomato, lettuce, cilantro and avocado.',
    'Build at the table: beef, cheese, salad, a squeeze of lime.',
  ]),
  R('pancakes', 'Fluffy pancakes', { time: 20, serves: 3, tags: ['vegetarian', 'breakfast'] }, [
    need('flour', '200 g'), need('egg', '1'), need('milk', '300 ml'), need('baking_powder', '2 tsp'), need('butter', '2 tbsp'), opt('sugar', '1 tbsp'), opt('maple_syrup', 'to serve'), opt('blueberry', 'a handful'), opt('banana', '1'), opt('vanilla', '1 tsp'),
  ], [
    'Whisk flour, baking powder, sugar and a pinch of salt. Whisk the egg, milk and melted butter separately, then combine to a lumpy batter. Do not overmix.',
    'Ladle onto a hot buttered pan. Add blueberries or banana slices on top. Flip when bubbles burst on the surface, about 2 minutes, and cook a minute more.',
    'Serve with maple syrup.',
  ]),
  R('lentil_soup', 'Carrot and lentil soup', { time: 35, serves: 4, tags: ['vegan', 'cheap', 'freezes well'] }, [
    need('lentils', '200 g'), need('carrot', '4'), need('onion', '1'), need('stock', '1 litre'), need('olive_oil', '2 tbsp'), opt('cumin', '1 tsp'), opt('garlic', '2 cloves'), opt('celery', '2 sticks'), opt('lemon', '1/2'), opt('bread', 'to serve'), opt('yogurt', 'to serve'),
  ], [
    'Soften the chopped onion, carrot and celery in the oil for 10 minutes. Add garlic and cumin.',
    'Add the rinsed lentils and stock and simmer 20 minutes until everything is soft.',
    'Blend smooth or leave it rustic. Season, add lemon, and serve with bread and a spoon of yogurt.',
  ]),
  R('minestrone', 'Minestrone', { time: 40, serves: 6, tags: ['vegetarian', 'freezes well', 'uses up veg'] }, [
    need('canned_tomato', '1 can'), need('stock', '1.2 litres'), need('onion', '1'), need('carrot', '2'), need('celery', '2 sticks'), need('garlic', '2 cloves'), need('olive_oil', '2 tbsp'),
    opt('white_beans', '1 can'), opt('pasta', '100 g small'), opt('zucchini', '1'), opt('kale', 'a handful'), opt('spinach', 'a handful'), opt('green_beans', '100 g'), opt('parmesan', 'to serve'), opt('oregano', '1 tsp'), opt('bay_leaf', '1'),
  ], [
    'Soften the diced onion, carrot and celery in the oil for 10 minutes; add garlic and dried herbs.',
    'Add tomatoes, stock, beans and bay. Simmer 15 minutes.',
    'Add the pasta and any quick-cooking vegetables and cook 10 minutes more. Season and serve with parmesan.',
  ]),
  R('salmon_tray', 'Salmon and potato tray bake', { time: 40, serves: 2, tags: ['one pan'] }, [
    need('salmon', '2 fillets'), need('potato', '400 g'), need('olive_oil', '2 tbsp'), need('lemon', '1'), opt('asparagus', '1 bunch'), opt('green_beans', '150 g'), opt('tomato', '150 g cherry'), opt('dill', 'a few sprigs'), opt('garlic', '2 cloves'),
  ], [
    'Heat the oven to 200°C / 400°F. Halve the potatoes, toss with oil and salt and roast 20 minutes.',
    'Add the salmon, green vegetables, tomatoes and garlic to the tray. Squeeze over lemon and roast 12–15 minutes more.',
    'Scatter with dill and lemon zest.',
  ]),
  R('fish_tacos', 'Crispy fish tacos', { time: 30, serves: 3, tags: [] }, [
    need('white_fish', '400 g'), need('tortilla', '6 small'), need('flour', '4 tbsp'), need('vegetable_oil', 'for frying'), need('lime', '2'), opt('cabbage', '1/4'), opt('mayonnaise', '3 tbsp'), opt('hot_sauce', '1 tsp'), opt('cilantro', 'a handful'), opt('avocado', '1'), opt('paprika', '1 tsp'),
  ], [
    'Cut the fish into strips and toss in seasoned flour with paprika. Shallow-fry in hot oil 2 minutes a side until crisp.',
    'Shred the cabbage and dress with lime juice and salt. Mix mayonnaise with hot sauce and lime.',
    'Fill warm tortillas with fish, slaw, spicy mayo, avocado and cilantro.',
  ]),
  R('mac_cheese', 'Stovetop mac and cheese', { time: 25, serves: 4, tags: ['vegetarian', 'comfort'] }, [
    need('pasta', '350 g macaroni'), need('cheddar', '250 g'), need('milk', '500 ml'), need('butter', '40 g'), need('flour', '3 tbsp'), opt('mustard', '1 tsp'), opt('nutmeg', 'a pinch'), opt('breadcrumbs', '3 tbsp'), opt('bacon', '4 rashers'), opt('parmesan', '30 g'),
  ], [
    'Cook the macaroni. Meanwhile melt the butter, stir in the flour for a minute, then whisk in the milk gradually to a smooth sauce.',
    'Simmer 3 minutes, then take off the heat and stir in the cheese, mustard and nutmeg. Season.',
    'Fold the pasta into the sauce. For a crust, top with breadcrumbs and parmesan and grill until golden.',
  ]),
  R('bolognese', 'Bolognese', { time: 75, serves: 6, tags: ['batch cook', 'freezes well'] }, [
    need('ground_beef', '500 g'), need('onion', '1'), need('carrot', '1'), need('celery', '1 stick'), need('garlic', '2 cloves'), need('canned_tomato', '2 cans'), need('olive_oil', '2 tbsp'), need('pasta', '500 g'),
    opt('tomato_paste', '2 tbsp'), opt('red_wine', '150 ml'), opt('bacon', '100 g'), opt('milk', '100 ml'), opt('oregano', '1 tsp'), opt('bay_leaf', '1'), opt('parmesan', 'to serve'),
  ], [
    'Soften finely diced onion, carrot and celery (and bacon) in the oil for 10 minutes. Add garlic.',
    'Add the beef and brown it well. Stir in tomato paste, then the wine, and let it bubble away.',
    'Add tomatoes, herbs and milk. Simmer gently, partly covered, for at least 45 minutes. Season.',
    'Serve over pasta with parmesan.',
  ]),
  R('greek_salad', 'Greek salad', { time: 10, serves: 2, tags: ['vegetarian', 'no cook', 'quick'] }, [
    need('tomato', '3'), need('cucumber', '1'), need('feta', '150 g'), need('olive_oil', '3 tbsp'), need('olives', 'a handful'), opt('onion', '1/2 red'), opt('oregano', '1 tsp'), opt('bell_pepper', '1'), opt('vinegar', '1 tbsp red wine'), opt('pita', 'to serve'),
  ], [
    'Cut the tomatoes into wedges and the cucumber and pepper into chunks. Slice the onion thinly.',
    'Toss with olives, oil, vinegar, oregano, salt and pepper. Lay the feta on top in a slab.',
  ]),
  R('chickpea_salad', 'Chickpea and herb salad', { time: 15, serves: 2, tags: ['vegan', 'no cook', 'pantry'] }, [
    need('chickpeas', '1 can'), need('lemon', '1'), need('olive_oil', '3 tbsp'), opt('cucumber', '1/2'), opt('tomato', '2'), opt('parsley', 'a bunch'), opt('mint', 'a handful'), opt('onion', '1/2 red'), opt('feta', '50 g'), opt('cumin', '1/2 tsp'), opt('pita', 'to serve'),
  ], [
    'Drain and rinse the chickpeas. Dice the cucumber, tomato and onion and chop the herbs.',
    'Toss everything with lemon juice, oil, cumin and plenty of salt. Better after 10 minutes.',
  ]),
  R('hummus', 'Homemade hummus', { time: 10, serves: 4, tags: ['vegan', 'no cook', 'pantry'] }, [
    need('chickpeas', '1 can'), need('tahini', '3 tbsp'), need('lemon', '1'), need('garlic', '1 clove'), need('olive_oil', '2 tbsp'), opt('cumin', '1/2 tsp'), opt('paprika', 'to serve'), opt('pita', 'to serve'),
  ], [
    'Blend the drained chickpeas with tahini, lemon juice, garlic, cumin and salt, adding cold water a spoon at a time until whipped and smooth.',
    'Swirl onto a plate, drizzle with oil and dust with paprika.',
  ]),
  R('pea_soup', 'Ten-minute pea and mint soup', { time: 12, serves: 3, tags: ['vegetarian', 'quick', 'freezer'] }, [
    need('peas', '500 g frozen'), need('stock', '700 ml'), need('onion', '1'), need('butter', '1 tbsp'), opt('mint', 'a handful'), opt('cream', '3 tbsp'), opt('lemon', '1/2'), opt('garlic', '1 clove'),
  ], [
    'Soften the chopped onion in the butter for 5 minutes. Add the stock and bring to a boil.',
    'Tip in the peas, cook 3 minutes, add mint and blend smooth. Finish with cream, lemon and pepper.',
  ]),
  R('chicken_soup', 'Chicken noodle soup', { time: 35, serves: 4, tags: ['comfort'] }, [
    need('chicken_thigh', '400 g'), need('stock', '1.2 litres'), need('carrot', '2'), need('celery', '2 sticks'), need('onion', '1'), need('noodles', '150 g egg'), opt('garlic', '2 cloves'), opt('bay_leaf', '1'), opt('parsley', 'a handful'), opt('lemon', '1/2'), opt('dried_thyme', '1/2 tsp'),
  ], [
    'Simmer the chicken in the stock with the bay leaf for 20 minutes. Lift out, shred, and return.',
    'Add diced carrot, celery, onion and garlic and simmer 10 minutes.',
    'Cook the noodles in the soup for the last few minutes. Season with lemon, pepper and parsley.',
  ]),
  R('pizza_toast', 'Pizza toast', { time: 10, serves: 2, tags: ['vegetarian', 'quick', 'kids'] }, [
    need('bread', '4 slices'), need('mozzarella', '150 g'), opt('tomato_paste', '2 tbsp'), opt('canned_tomato', '4 tbsp'), opt('oregano', '1 tsp'), opt('ham', '2 slices'), opt('mushroom', '4'), opt('olives', 'a few'), opt('basil', 'a few leaves'), opt('bell_pepper', '1/2'),
  ], [
    'Toast the bread lightly. Spread with tomato paste or a spoon of crushed tomatoes and sprinkle with oregano.',
    'Top with cheese and whatever else, and grill until bubbling.',
  ]),
  R('banana_bread', 'Banana bread', { time: 70, serves: 8, tags: ['vegetarian', 'baking', 'uses up bananas'] }, [
    need('banana', '3 very ripe'), need('flour', '250 g'), need('sugar', '150 g'), need('egg', '2'), need('butter', '100 g'), need('baking_powder', '1 tsp'), opt('cinnamon', '1 tsp'), opt('nuts', '75 g walnuts'), opt('cocoa', '75 g chocolate chips'), opt('vanilla', '1 tsp'),
  ], [
    'Heat the oven to 170°C / 340°F and line a loaf tin. Mash the bananas.',
    'Beat the melted butter with the sugar and eggs, stir in the banana, then fold in the flour, baking powder, cinnamon and any nuts or chocolate.',
    'Bake 55–60 minutes until a skewer comes out clean. Cool in the tin 10 minutes.',
  ]),
  R('oatmeal', 'Porridge with fruit', { time: 8, serves: 1, tags: ['vegetarian', 'breakfast', 'quick'] }, [
    need('oats', '50 g'), need('milk', '300 ml'), opt('banana', '1'), opt('blueberry', 'a handful'), opt('honey', '1 tsp'), opt('cinnamon', 'a pinch'), opt('nuts', '1 tbsp'), opt('peanut_butter', '1 tbsp'), opt('apple', '1'),
  ], [
    'Simmer the oats in the milk with a pinch of salt, stirring, for 5 minutes until creamy.',
    'Top with fruit, honey, cinnamon and nuts.',
  ]),
  R('veg_frittata', 'Leftover vegetable frittata', { time: 25, serves: 4, tags: ['vegetarian', 'uses leftovers', 'one pan'] }, [
    need('egg', '6'), need('olive_oil', '2 tbsp'), need('cheddar', '80 g'), opt('potato', '2 cooked'), opt('onion', '1'), opt('spinach', 'a handful'), opt('bell_pepper', '1'), opt('zucchini', '1'), opt('mushroom', '6'), opt('feta', '80 g'), opt('parsley', 'a handful'), opt('spring_onion', '3'),
  ], [
    'Fry your vegetables in the oil in an oven-safe pan until soft; cooked potato just needs to brown.',
    'Beat the eggs with salt, pepper and most of the cheese and pour over. Cook on low until the edges set.',
    'Scatter the rest of the cheese on top and finish under a hot grill for 3–4 minutes until puffed and golden.',
  ]),
  R('sausage_tray', 'Sausage and pepper tray bake', { time: 45, serves: 4, tags: ['one pan'] }, [
    need('sausage', '8'), need('bell_pepper', '2'), need('onion', '2'), need('potato', '600 g'), need('olive_oil', '2 tbsp'), opt('garlic', '4 cloves'), opt('rosemary', '2 sprigs'), opt('tomato', '200 g cherry'), opt('paprika', '1 tsp'), opt('mustard', 'to serve'),
  ], [
    'Heat the oven to 200°C / 400°F. Toss chunks of potato, pepper and onion with the oil, garlic, rosemary and paprika on a large tray.',
    'Nestle in the sausages and roast 40 minutes, turning halfway, until the potatoes are crisp and the sausages browned. Add tomatoes for the last 10.',
  ]),
  R('stir_fry_noodles', 'Soy and garlic noodles', { time: 15, serves: 2, tags: ['vegan', 'quick', 'cheap'] }, [
    need('noodles', '200 g'), need('soy_sauce', '3 tbsp'), need('garlic', '3 cloves'), need('vegetable_oil', '2 tbsp'), opt('frozen_veg', '200 g stir fry mix'), opt('bell_pepper', '1'), opt('cabbage', '1/4'), opt('carrot', '1'), opt('sesame_oil', '1 tsp'), opt('honey', '1 tbsp'), opt('chili', '1'), opt('spring_onion', '2'), opt('egg', '2'), opt('seeds', '1 tbsp sesame'),
  ], [
    'Cook the noodles, drain and rinse briefly. Mix soy, honey, sesame oil and a splash of water.',
    'Stir-fry garlic and chili in hot oil for 20 seconds, then the vegetables for 3 minutes. Add an egg if you like and scramble it through.',
    'Add the noodles and sauce and toss until glossy. Top with spring onion and sesame.',
  ]),
  R('quesadilla', 'Quesadillas', { time: 12, serves: 2, tags: ['vegetarian', 'quick', 'kids'] }, [
    need('tortilla', '4'), need('cheddar', '150 g'), opt('black_beans', '1/2 can'), opt('spring_onion', '2'), opt('chicken_breast', '1 cooked'), opt('salsa', 'to serve'), opt('bell_pepper', '1/2'), opt('corn', '1/2 cup'), opt('avocado', '1'), opt('cilantro', 'a handful'),
  ], [
    'Lay a tortilla in a dry pan over medium heat, scatter over cheese and fillings, and top with another tortilla.',
    'Cook 2–3 minutes a side until golden and the cheese has melted. Cut into wedges and serve with salsa and avocado.',
  ]),
  R('potato_soup', 'Leek and potato soup', { time: 35, serves: 4, tags: ['vegetarian', 'comfort', 'freezes well'] }, [
    need('potato', '600 g'), need('leek', '2'), need('stock', '1 litre'), need('butter', '2 tbsp'), opt('onion', '1'), opt('cream', '100 ml'), opt('garlic', '2 cloves'), opt('bay_leaf', '1'), opt('bread', 'to serve'), opt('parsley', 'to serve'), opt('bacon', '4 rashers'),
  ], [
    'Sweat the sliced leek (and onion, garlic) in the butter for 10 minutes without browning.',
    'Add the diced potato, stock and bay. Simmer 20 minutes until the potato collapses.',
    'Blend to your liking, stir in cream and season generously. Top with crisp bacon and parsley.',
  ]),
  R('pork_chops', 'Pan-fried pork chops with apples', { time: 25, serves: 2, tags: [] }, [
    need('pork_chop', '2 thick'), need('apple', '1'), need('butter', '2 tbsp'), need('onion', '1'), opt('mustard', '1 tbsp'), opt('cream', '100 ml'), opt('dried_thyme', '1/2 tsp'), opt('potato', 'to serve'), opt('white_wine', '100 ml'), opt('stock', '100 ml'),
  ], [
    'Season the chops well and sear in a hot pan with a little butter, 4 minutes a side. Rest on a plate.',
    'Soften sliced onion and apple wedges in the remaining butter with thyme. Add wine or stock and bubble down.',
    'Stir in mustard and cream, return the chops to warm through, and serve with potatoes.',
  ]),
  R('steak_dinner', 'Steak with garlic butter', { time: 20, serves: 2, tags: ['quick'] }, [
    need('beef_steak', '2'), need('butter', '3 tbsp'), need('garlic', '2 cloves'), need('vegetable_oil', '1 tbsp'), opt('rosemary', '1 sprig'), opt('thyme', '2 sprigs'), opt('potato', 'to serve'), opt('green_beans', '200 g'), opt('mushroom', '150 g'), opt('lettuce', 'to serve'),
  ], [
    'Bring the steaks to room temperature and season heavily. Get a heavy pan smoking hot with the oil.',
    'Sear 2–4 minutes a side depending on thickness. In the last minute add butter, crushed garlic and herbs and baste.',
    'Rest 5 minutes. Fry mushrooms or steam beans in the same pan while it rests.',
  ]),
  R('lamb_kofta', 'Lamb kofta with yogurt', { time: 30, serves: 4, tags: [] }, [
    need('lamb', '500 g mince'), need('onion', '1'), need('cumin', '2 tsp'), need('coriander_seed', '1 tsp'), need('garlic', '2 cloves'), need('yogurt', '200 g'), opt('parsley', 'a bunch'), opt('mint', 'a handful'), opt('pita', '4'), opt('lemon', '1'), opt('cinnamon', '1/2 tsp'), opt('tomato', '2'), opt('cucumber', '1/2'),
  ], [
    'Mix the lamb with grated onion, garlic, spices, chopped herbs and salt. Shape into 12 fat fingers and chill 10 minutes.',
    'Grill or pan-fry 8–10 minutes, turning, until browned and cooked through.',
    'Stir mint, lemon and salt into the yogurt. Serve in warm pita with tomato and cucumber.',
  ]),
  R('shrimp_garlic', 'Garlic shrimp', { time: 12, serves: 2, tags: ['quick'] }, [
    need('shrimp', '300 g'), need('garlic', '4 cloves'), need('olive_oil', '3 tbsp'), need('lemon', '1'), opt('chili_powder', '1/2 tsp'), opt('parsley', 'a handful'), opt('bread', 'to serve'), opt('butter', '1 tbsp'), opt('white_wine', '50 ml'), opt('pasta', '200 g'),
  ], [
    'Warm the oil with sliced garlic and chili until it just sizzles. Add the shrimp and cook 2 minutes a side until pink.',
    'Add butter, wine and lemon juice and let it bubble for a minute. Scatter with parsley and mop up with bread, or toss with pasta.',
  ]),
  R('rice_bowl', 'Miso tofu rice bowl', { time: 25, serves: 2, tags: ['vegan', 'quick'] }, [
    need('tofu', '300 g firm'), need('rice', '200 g'), need('soy_sauce', '2 tbsp'), need('vegetable_oil', '2 tbsp'), opt('miso', '1 tbsp'), opt('honey', '1 tbsp'), opt('ginger', '1 thumb'), opt('garlic', '2 cloves'), opt('broccoli', '1 head'), opt('cucumber', '1/2'), opt('avocado', '1'), opt('spring_onion', '2'), opt('seeds', '1 tbsp sesame'), opt('sesame_oil', '1 tsp'), opt('hot_sauce', 'to taste'),
  ], [
    'Cook the rice. Press and cube the tofu, and toss with a little cornstarch or flour if you have it.',
    'Fry the tofu in the oil until crisp on all sides. Mix soy, miso, honey, grated ginger and garlic with a splash of water and pour over; toss until sticky.',
    'Steam the broccoli. Build bowls of rice, tofu, broccoli, cucumber and avocado, and finish with sesame, spring onion and hot sauce.',
  ]),
  R('tomato_soup', 'Roasted tomato soup', { time: 45, serves: 4, tags: ['vegan', 'freezes well'] }, [
    need('tomato', '1 kg'), need('onion', '1'), need('garlic', '4 cloves'), need('olive_oil', '3 tbsp'), need('stock', '500 ml'), opt('basil', 'a handful'), opt('canned_tomato', '1 can'), opt('bread', 'to serve'), opt('cream', '50 ml'), opt('sugar', '1 tsp'), opt('bell_pepper', '1 red'),
  ], [
    'Heat the oven to 200°C / 400°F. Roast halved tomatoes, quartered onion, pepper and whole garlic cloves in the oil for 30 minutes until blistered.',
    'Tip into a pan with the stock (and a can of tomatoes to stretch it), simmer 5 minutes and blend. Season with salt, sugar and basil.',
  ]),
  R('caprese', 'Tomato and mozzarella salad', { time: 5, serves: 2, tags: ['vegetarian', 'no cook', 'quick'] }, [
    need('tomato', '4'), need('mozzarella', '1 ball'), need('basil', 'a handful'), need('olive_oil', '2 tbsp'), opt('vinegar', '1 tsp balsamic'), opt('bread', 'to serve'),
  ], [
    'Slice the tomatoes and mozzarella and overlap on a plate with the basil leaves.',
    'Season with flaky salt and pepper and drizzle with oil and a little balsamic. Eat with bread.',
  ]),
  R('apple_crumble', 'Apple crumble', { time: 50, serves: 6, tags: ['vegetarian', 'dessert', 'baking'] }, [
    need('apple', '5'), need('flour', '175 g'), need('butter', '110 g'), need('sugar', '150 g'), opt('cinnamon', '1 tsp'), opt('oats', '50 g'), opt('cream', 'to serve'), opt('ice_cream', 'to serve'), opt('nuts', '50 g'), opt('lemon', '1/2'),
  ], [
    'Heat the oven to 190°C / 375°F. Peel and slice the apples into a dish with a third of the sugar, cinnamon and lemon juice.',
    'Rub the butter into the flour until it looks like breadcrumbs, then stir in the rest of the sugar and the oats and nuts.',
    'Pile the crumble over the fruit and bake 35–40 minutes until golden and bubbling. Serve with cream or ice cream.',
  ]),
  R('smoothie', 'Fruit smoothie', { time: 5, serves: 2, tags: ['vegetarian', 'breakfast', 'no cook'] }, [
    need('banana', '1'), need('milk', '250 ml'), opt('frozen_berries', '150 g'), opt('strawberry', 'a handful'), opt('blueberry', 'a handful'), opt('mango', '1/2'), opt('yogurt', '3 tbsp'), opt('honey', '1 tsp'), opt('oats', '2 tbsp'), opt('peanut_butter', '1 tbsp'), opt('spinach', 'a handful'),
  ], [
    'Blend everything until smooth, adding more milk to loosen. Frozen fruit makes it thick and cold without ice.',
  ]),
  R('bean_chili', 'Three-bean vegetarian chili', { time: 40, serves: 6, tags: ['vegan', 'batch cook', 'pantry'] }, [
    need('canned_tomato', '2 cans'), need('onion', '1'), need('garlic', '3 cloves'), need('cumin', '2 tsp'), need('chili_powder', '1 tsp'), need('paprika', '1 tsp'), need('vegetable_oil', '2 tbsp'),
    opt('black_beans', '1 can'), opt('kidney_beans', '1 can'), opt('chickpeas', '1 can'), opt('white_beans', '1 can'), opt('bell_pepper', '1'), opt('corn', '1 cup'), opt('sweet_potato', '1'), opt('cocoa', '1 tsp'), opt('lime', '1'), opt('cilantro', 'a handful'), opt('rice', 'to serve'), opt('avocado', '1'),
  ], [
    'Soften the onion, pepper and diced sweet potato in the oil for 8 minutes. Add garlic and spices, and a teaspoon of cocoa for depth.',
    'Add the tomatoes and at least two cans of drained beans. Simmer 25 minutes until thick, then add the corn.',
    'Season with salt and lime. Serve with rice, avocado and cilantro.',
  ]),
  R('cauliflower_curry', 'Chickpea and cauliflower curry', { time: 35, serves: 4, tags: ['vegan', 'cheap'] }, [
    need('cauliflower', '1 head'), need('chickpeas', '1 can'), need('canned_tomato', '1 can'), need('onion', '1'), need('garlic', '3 cloves'), need('curry_powder', '2 tbsp'), need('vegetable_oil', '2 tbsp'), opt('coconut_milk', '1 can'), opt('ginger', '1 thumb'), opt('spinach', '100 g'), opt('rice', 'to serve'), opt('cilantro', 'a handful'), opt('lime', '1'), opt('pita', 'to serve'),
  ], [
    'Fry the onion until golden, add garlic, ginger and curry powder for a minute.',
    'Add cauliflower florets, tomatoes, coconut milk and the drained chickpeas. Simmer 20 minutes until the cauliflower is tender.',
    'Wilt in the spinach, season with lime and salt, and serve with rice or flatbread.',
  ]),
  R('bacon_egg_sandwich', 'Bacon and egg sandwich', { time: 10, serves: 1, tags: ['breakfast', 'quick'] }, [
    need('bacon', '3 rashers'), need('egg', '1'), need('bread', '2 slices'), opt('butter', 'to spread'), opt('ketchup', 'to taste'), opt('hot_sauce', 'to taste'), opt('cheddar', '1 slice'), opt('tomato', '1'), opt('avocado', '1/2'),
  ], [
    'Fry the bacon until crisp, then fry the egg in its fat. Toast and butter the bread.',
    'Stack bacon, egg, cheese and whatever else between the slices. Ketchup or hot sauce is not optional in spirit.',
  ]),
  R('coleslaw', 'Quick coleslaw', { time: 10, serves: 4, tags: ['vegetarian', 'no cook', 'side'] }, [
    need('cabbage', '1/2'), need('carrot', '2'), need('mayonnaise', '4 tbsp'), opt('mustard', '1 tsp'), opt('vinegar', '1 tbsp'), opt('onion', '1/2 red'), opt('apple', '1'), opt('yogurt', '2 tbsp'), opt('lemon', '1/2'),
  ], [
    'Shred the cabbage and grate the carrot and apple. Slice the onion paper-thin.',
    'Mix mayonnaise with mustard, vinegar or lemon and seasoning, and fold through. Rest 10 minutes before serving.',
  ]),
  R('mushroom_risotto', 'Mushroom risotto', { time: 40, serves: 3, tags: ['vegetarian', 'comfort'] }, [
    need('rice', '300 g risotto'), need('mushroom', '300 g'), need('onion', '1'), need('stock', '1 litre'), need('butter', '50 g'), need('parmesan', '50 g'), opt('garlic', '2 cloves'), opt('white_wine', '150 ml'), opt('thyme', '2 sprigs'), opt('parsley', 'a handful'), opt('olive_oil', '1 tbsp'),
  ], [
    'Fry the sliced mushrooms hard in a little oil until browned; set aside. Soften the diced onion in half the butter with garlic and thyme.',
    'Add the rice and stir 2 minutes, then the wine. Add hot stock a ladle at a time, stirring, until the rice is creamy and just tender, about 18 minutes.',
    'Beat in the rest of the butter, parmesan and mushrooms. Rest 2 minutes off the heat, then serve with parsley.',
  ]),
  R('squash_soup', 'Butternut squash soup', { time: 45, serves: 4, tags: ['vegan', 'freezes well', 'comfort'] }, [
    need('squash', '1 butternut'), need('onion', '1'), need('stock', '1 litre'), need('olive_oil', '2 tbsp'), opt('garlic', '2 cloves'), opt('ginger', '1 thumb'), opt('coconut_milk', '200 ml'), opt('chili_powder', 'a pinch'), opt('cream', '50 ml'), opt('bread', 'to serve'), opt('seeds', '1 tbsp pumpkin'),
  ], [
    'Peel and cube the squash. Soften the chopped onion in the oil for 8 minutes, then add garlic and ginger.',
    'Add the squash and stock, cover and simmer 20 minutes until soft.',
    'Blend smooth with the coconut milk or cream. Season well, add a pinch of chili, and top with toasted seeds.',
  ]),
  R('halloumi_wraps', 'Halloumi and roast pepper wraps', { time: 20, serves: 2, tags: ['vegetarian', 'quick'] }, [
    need('halloumi', '1 block'), need('tortilla', '2 large'), need('bell_pepper', '1'), need('olive_oil', '1 tbsp'), opt('hummus', '3 tbsp'), opt('lettuce', 'a handful'), opt('tomato', '1'), opt('cucumber', '1/2'), opt('lemon', '1/2'), opt('hot_sauce', 'to taste'), opt('mint', 'a few leaves'), opt('onion', '1/2 red'),
  ], [
    'Slice the halloumi and pepper. Fry the pepper in the oil until soft and charred, then the halloumi 2 minutes a side until golden.',
    'Warm the wraps. Spread with hummus, pile in the halloumi, pepper and salad, squeeze over lemon, add hot sauce and roll.',
  ]),
  R('sausage_bean_stew', 'Sausage and bean stew', { time: 40, serves: 4, tags: ['comfort', 'freezes well', 'one pot'] }, [
    need('sausage', '6'), need('white_beans', '1 can'), need('canned_tomato', '1 can'), need('onion', '1'), need('garlic', '2 cloves'), need('olive_oil', '1 tbsp'), opt('paprika', '1 tsp smoked'), opt('carrot', '1'), opt('kale', 'a handful'), opt('spinach', 'a handful'), opt('stock', '200 ml'), opt('bread', 'to serve'), opt('bay_leaf', '1'), opt('dried_thyme', '1/2 tsp'),
  ], [
    'Brown the sausages in the oil, then lift out and slice into chunks.',
    'Soften the onion and carrot in the pan, add garlic, paprika and herbs, then the tomatoes, beans, stock and sausages. Simmer 20 minutes.',
    'Stir in the greens for the last 3 minutes and serve with bread.',
  ]),
  R('salmon_bagel', 'Smoked salmon bagel', { time: 5, serves: 1, tags: ['quick', 'breakfast', 'no cook'] }, [
    need('bagel', '1'), need('cream_cheese', '2 tbsp'), need('salmon', '2 slices smoked'), opt('lemon', 'a squeeze'), opt('capers', '1 tsp'), opt('onion', 'a few slices red'), opt('dill', 'a few sprigs'), opt('cucumber', 'a few slices'), opt('black_pepper', 'plenty'),
  ], [
    'Toast the bagel and spread thickly with cream cheese.',
    'Lay on the salmon, then capers, onion, cucumber and dill. Finish with lemon and pepper.',
  ]),
  R('beetroot_salad', 'Beetroot, goat cheese and walnut salad', { time: 15, serves: 2, tags: ['vegetarian', 'no cook', 'quick'] }, [
    need('beetroot', '3 cooked'), need('goat_cheese', '100 g'), need('lettuce', '2 handfuls'), need('olive_oil', '2 tbsp'), need('vinegar', '1 tbsp balsamic'), opt('nuts', '50 g walnuts'), opt('honey', '1 tsp'), opt('orange', '1'), opt('mint', 'a few leaves'), opt('bread', 'to serve'),
  ], [
    'Cut the beetroot into wedges and toss with the oil, vinegar, honey and seasoning.',
    'Pile onto the leaves with orange segments, crumble over the goat cheese and scatter with walnuts and mint.',
  ]),
  R('roast_sprouts', 'Crispy roasted Brussels sprouts', { time: 30, serves: 4, tags: ['vegan', 'side', 'one pan'] }, [
    need('brussels_sprouts', '500 g'), need('olive_oil', '2 tbsp'), opt('garlic', '2 cloves'), opt('bacon', '4 rashers'), opt('lemon', '1/2'), opt('parmesan', '30 g'), opt('honey', '1 tbsp'), opt('chili_powder', 'a pinch'), opt('vinegar', '1 tbsp balsamic'),
  ], [
    'Heat the oven to 220°C / 425°F. Halve the sprouts and toss with the oil, salt and any bacon or garlic.',
    'Roast cut side down for 20–25 minutes until deeply browned and crisp at the edges. Finish with lemon, parmesan, honey or balsamic.',
  ]),
  R('turkey_chili_lettuce', 'Turkey lettuce cups', { time: 20, serves: 3, tags: ['quick'] }, [
    need('turkey', '400 g mince'), need('lettuce', '1 head'), need('soy_sauce', '2 tbsp'), need('garlic', '2 cloves'), need('vegetable_oil', '1 tbsp'), opt('ginger', '1 thumb'), opt('hot_sauce', '1 tsp'), opt('spring_onion', '2'), opt('carrot', '1'), opt('nuts', '2 tbsp peanuts'), opt('lime', '1'), opt('honey', '1 tsp'), opt('rice', 'to serve'),
  ], [
    'Fry the turkey in the oil until browned and crumbly. Add garlic, ginger and grated carrot for 2 minutes.',
    'Season with soy, honey, hot sauce and lime. Spoon into lettuce leaves and top with spring onion and peanuts.',
  ]),
  R('polenta_mushrooms', 'Polenta with garlic mushrooms', { time: 25, serves: 2, tags: ['vegetarian', 'comfort'] }, [
    need('polenta', '150 g'), need('mushroom', '300 g'), need('butter', '40 g'), need('garlic', '2 cloves'), need('stock', '600 ml'), opt('parmesan', '40 g'), opt('thyme', '2 sprigs'), opt('parsley', 'a handful'), opt('cream', '3 tbsp'), opt('lemon', '1/2'),
  ], [
    'Bring the stock to a simmer and whisk in the polenta. Cook, stirring, 10–15 minutes until thick. Beat in half the butter and the parmesan.',
    'Fry the mushrooms hard in the rest of the butter until browned, add garlic and thyme for a minute, then a splash of cream and lemon. Spoon over the polenta with parsley.',
  ]),
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));
