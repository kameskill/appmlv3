/**
 * Returns the current Philippine season.
 *
 * Rainy season: June to November
 * Dry season: December to May
 */
export const getPhilippineSeason = (date = new Date()) => {
    const month = date.getMonth() + 1

    if (month >= 6 && month <= 11) {
        return {
            key: 'rainy',
            name: 'Rainy Season',
            label: 'Rainy Season',
            advice: 'Keep coats manageable to avoid mud, matting, and dampness.',
            weatherContext: 'Philippines rainy season humidity profile'
        }
    }

    return {
        key: 'dry',
        name: 'Dry Season',
        label: 'Dry Season',
        advice: 'Choose lightweight and breathable grooming styles to help pets stay cool.',
        weatherContext: 'Philippines dry season heat profile'
    }
}