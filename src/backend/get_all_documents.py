import requests
import json

def get_all_documents():
    """
    Retrieves all documents from the knowledge base backend.
    """
    all_documents = []
    page = 1
    size = 100  # Adjust size as needed, but 100 is a good starting point

    while True:
        try:
            response = requests.get(f'http://127.0.0.1:5000/api/v1/documents/?page={page}&size={size}')
            response.raise_for_status()  # Raise an exception for bad status codes
            data = response.json()

            if data.get('success') and data.get('data'):
                all_documents.extend(data['data'])
                if len(data['data']) < size:
                    # Last page
                    break
                page += 1
            else:
                print(f"Failed to retrieve documents: {data.get('message')}")
                break
        except requests.exceptions.RequestException as e:
            print(f"An error occurred: {e}")
            break
    
    return all_documents

if __name__ == '__main__':
    documents = get_all_documents()
    if documents:
        # Print document IDs
        for doc in documents:
            print(doc['id'])