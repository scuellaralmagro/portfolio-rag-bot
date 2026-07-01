# Airline Tweet Sentiment Analysis

Airline Tweet Sentiment Analysis is a natural-language-processing project that compares
three sentiment-analysis approaches — VADER, Naive Bayes, and a linear Support Vector
Machine (SVM) — over the Twitter US Airline Sentiment dataset of 14,640 tweets. Each tweet
is classified as positive, negative, or neutral, and the models are evaluated head to head.

## Approach and results

The project covers the full NLP workflow: text preprocessing, feature extraction, and
classification. Of the three approaches, the linear SVM performed best, reaching about 79%
accuracy on held-out data. The comparison illustrates the practical trade-offs between a
lexicon-based method (VADER) and trained machine-learning classifiers (Naive Bayes and SVM).

## Airline sentiment tech stack and source

Python, NLTK, scikit-learn, Pandas, and Jupyter. The source code is available on GitHub at
github.com/scuellaralmagro/airline-sentiment-analysis.
