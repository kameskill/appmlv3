# Dataset notes

## `breed_grooming_dataset.csv`

Curated grooming traits for breeds supported by Timmy Tails. The dataset includes coat structure, size, shedding, grooming frequency, matting risk, heat/moisture sensitivity, and double-coat clipping risk.

AKC breed and grooming references were used to structure recognized-breed traits. Aspin, American Bully, Mixed Breed, and Other use conservative Timmy Tails local/fallback profiles.

## `haircut_catalog.csv`

Timmy Tails service-domain data containing haircut prices, compatible coat types and sizes, maintenance level, rainy/dry fit, clipping intensity, undercoat safety, and a starting popularity prior.

## `recommendation_training.csv`

Generated automatically by `recommendation_engine.py`. It is a cross-product of breed, haircut, and Philippine season records with a curated compatibility target. The Random Forest learns nonlinear relationships from this matrix.

## `sample_sales_history.csv`

Small development-only example. The production `/forecast/sales` endpoint trains from appointment records supplied by the Express backend. Sample data is not loaded automatically.
