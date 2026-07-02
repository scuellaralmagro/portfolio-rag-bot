# IBM Employee Attrition Prediction

IBM Employee Attrition Prediction is a machine-learning classification project that predicts
whether an employee will leave the company, using IBM's fictional HR Analytics dataset from
Kaggle (1,470 employees, 35 attributes each). It compares five scikit-learn models and, just
as importantly, takes an honest look at how to evaluate a classifier when the outcome is rare.

## The class-imbalance lesson

Only about 16% of employees in the dataset actually left, which makes overall accuracy
misleading — a model that predicts "nobody leaves" already scores around 84% while being
useless. For that reason the project judges models on recall and F1 score rather than
accuracy. Exploratory analysis first surfaced the real drivers of attrition: working overtime
(about 30% attrition), being a sales representative (about 40%), long commutes, frequent
travel, and younger age.

## Approach and results

An ETL step cleans the data (dropping constant and identifier columns, encoding binary fields
and one-hot encoding the rest), followed by an 80/20 split, feature scaling, and
RandomizedSearchCV hyperparameter tuning across Logistic Regression, Decision Tree, Gradient
Boosting, SVM, and KNN. Logistic Regression performed best on the metrics that matter (F1
around 0.59, recall around 0.46) and, being efficient, was the model deployed via joblib and
a small prediction script. The honest conclusion is that it still catches fewer than half of
real leavers, with clear next steps: class weights, resampling (SMOTE), and threshold tuning.

## Employee attrition tech stack and source

Python, scikit-learn, pandas, NumPy, Matplotlib, Seaborn, and Jupyter. The source code is
available on GitHub at github.com/scuellaralmagro/employee_attrition_ibm.
