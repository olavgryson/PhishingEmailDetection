import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys
import joblib
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay

# Add current directory to path
sys.path.append(os.getcwd())
from backend.features import HtmlFeatureExtractor, UrlFeatureExtractor, UrlTokenizer

def generate_graphs():
    print("Generating graphs...")
    os.makedirs('backend/graphs', exist_ok=True)
    
    #Load Data
    data_path = 'backend/data/dataset.csv'
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found. Run train_model.py first.")
        return

    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} samples from {data_path}")

    # Extract Features
    url_extractor = UrlFeatureExtractor()
    url_features = url_extractor.transform(df['body'])
    url_feature_names = ['has_ip', 'len_long', 'is_shortener']
    df_url = pd.DataFrame(url_features, columns=url_feature_names)
    
    # Add URL length explicitly as it's interesting
    df['url_length'] = df['body'].apply(len)
    
    # Combine
    df_analysis = pd.concat([df, df_url], axis=1)
    
    #URL Length Distribution
    plt.figure(figsize=(10, 6))
    sns.boxplot(x='label', y='url_length', data=df_analysis, palette="Set2")
    plt.title('URL Length Distribution: Phishing (1) vs Legitimate (0)')
    plt.ylabel('URL Length (chars)')
    plt.savefig('backend/graphs/url_length_distribution.png', dpi=150)
    plt.close()

    #Correlation Heatmap 
    plt.figure(figsize=(8, 6))
    cols_to_corr = ['label', 'url_length'] + url_feature_names
    corr = df_analysis[cols_to_corr].corr()
    sns.heatmap(corr, annot=True, cmap='coolwarm', center=0, fmt=".2f")
    plt.title('Feature Correlation Heatmap')
    plt.tight_layout()
    plt.savefig('backend/graphs/correlation_heatmap.png', dpi=150)
    plt.close()

    #Confusion Matrix
    model_path = 'backend/models/phishing_model.joblib'
    if os.path.exists(model_path):
        try:
            model = joblib.load(model_path)
            y_pred = model.predict(df['body'])
            cm = confusion_matrix(df['label'], y_pred)
            
            plt.figure(figsize=(8, 6))
            disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=['Legitimate', 'Phishing'])
            disp.plot(cmap='Blues')
            plt.title('Confusion Matrix (Sample Data)')
            plt.savefig('backend/graphs/confusion_matrix.png', dpi=150)
            plt.close()
            
            #Feature Importance
            try:
                # Access steps
                feature_union = model.named_steps['features']
                classifier = model.named_steps['classifier']
                
                # Get feature names from TFIDF
                tfidf = feature_union.transformer_list[0][1]
                tfidf_names = tfidf.get_feature_names_out()
                
                # Get feature names from others
                html_names = ['num_script', 'num_iframe', 'num_forms', 'num_hidden', 'num_links']
                url_names = ['has_ip', 'len_long', 'is_shortener']
                
                all_names = list(tfidf_names) + html_names + url_names
                
                importances = classifier.feature_importances_
                
                # Create DataFrame
                if len(all_names) == len(importances):
                    feat_imp = pd.DataFrame({'feature': all_names, 'importance': importances})
                    feat_imp = feat_imp.sort_values('importance', ascending=False).head(15)
                    
                    plt.figure(figsize=(10, 8))
                    sns.barplot(x='importance', y='feature', data=feat_imp, palette='viridis')
                    plt.title('Top 15 Most Important Features')
                    plt.tight_layout()
                    plt.savefig('backend/graphs/feature_importance.png', dpi=150)
                    print("Saved backend/graphs/feature_importance.png")
                    plt.close()
                else:
                    print(f"Feature name count ({len(all_names)}) does not match importance count ({len(importances)})")
                    
            except Exception as e:
                print(f"Could not generate feature importance graph: {e}")

        except Exception as e:
            print(f"Error loading model for graphs: {e}")
    else:
        print("Model not found, skipping model-based graphs.")

if __name__ == "__main__":
    generate_graphs()
