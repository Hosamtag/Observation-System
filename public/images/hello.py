import sys
import requests
import urllib.request
import spacy
from wordcloud import WordCloud, STOPWORDS
from bs4 import BeautifulSoup
import os
from PIL import Image
import numpy as np

currdir = os.path.dirname(__file__)

def create_wordcloud(topic):
    numResults=100
    url ="https://www.google.com/search?q="+topic+"&tbm=nws&hl=en&num="+str(numResults)
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    results = soup.find_all('div', attrs = {'class': 'ZINbbc'})
    descriptions = []
    for result in results:
        try:
            description = result.find('div', attrs={'class':'s3v9rd'}).get_text()
            if description != '': 
                descriptions.append(description)
        except:
            continue
    text = ''.join(descriptions)
    sp = spacy.load('en_core_web_sm')
    doc = sp(text)
    newText =''
    for word in doc:
        if word.pos_ in ['ADJ', 'NOUN']:
            newText = " ".join((newText, word.text.lower()))

    mask = np.array(Image.open(os.path.join(currdir,"cloud.png")))
    stopwords = set(STOPWORDS)
    wc = WordCloud(background_color="white",
    mask=mask,
    max_words = 200,
    stopwords= stopwords)

    wc.generate(newText)
    wc.to_file(os.path.join(currdir,sys.argv[1]+ ".png"))
    

create_wordcloud(sys.argv[1])