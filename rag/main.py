import os
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

DATA_PATH = "./Cat_Vault/wiki"
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
LLM_MODEL = "llama-3.3-70b-versatile"


def load_documents(data_path: str):
    if not os.path.exists(data_path):
        raise FileNotFoundError(
            f"ไม่พบโฟลเดอร์: '{data_path}'\n"
            f"กรุณาตรวจสอบว่าโฟลเดอร์ Cat_Vault/wiki อยู่ในตำแหน่งเดียวกับ main.py"
        )
    loader = DirectoryLoader(
        data_path,
        glob="**/*.md",
        loader_cls=TextLoader,
        loader_kwargs={"autodetect_encoding": True},
        show_progress=True,
    )
    docs = loader.load()
    if not docs:
        raise ValueError(f"ไม่พบไฟล์ .md ใน {data_path}")
    print(f"โหลดสำเร็จ: {len(docs)} ไฟล์")
    return docs


def split_documents(docs):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n## ", "\n### ", "\n\n", "\n", " "],
    )
    chunks = splitter.split_documents(docs)
    print(f"แบ่งเป็น {len(chunks)} chunks")
    return chunks


def build_retriever(chunks):
    print("กำลังสร้าง vector database (ครั้งแรกอาจใช้เวลาสักครู่)...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vector_db = FAISS.from_documents(chunks, embeddings)
    return vector_db.as_retriever(search_kwargs={"k": 3})


def build_rag_chain(retriever):
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("ไม่พบ GROQ_API_KEY — กรุณาสร้างไฟล์ .env และใส่ key ให้ถูกต้อง")

    llm = ChatGroq(
        temperature=0.1,
        model_name=LLM_MODEL,
        groq_api_key=groq_api_key,
    )

    template = """คุณคือผู้เชี่ยวชาญจากร้านม่านธารา ลพบุรี จงตอบคำถามโดยใช้ข้อมูลที่ให้มาอย่างตรงไปตรงมาและ Smart
ถ้าข้อมูลที่ให้มาไม่เพียงพอ ให้บอกตรงๆ ว่าไม่มีข้อมูลส่วนนั้น

ข้อมูลประกอบ:
{context}

คำถาม: {question}
คำตอบ:"""

    prompt = ChatPromptTemplate.from_template(template)

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    return (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )


def ask(rag_chain, query: str):
    print(f"\nคำถาม: {query}")
    print("-" * 50)
    answer = rag_chain.invoke(query)
    print(f"คำตอบ:\n{answer}\n")
    return answer


def main():
    docs = load_documents(DATA_PATH)
    chunks = split_documents(docs)
    retriever = build_retriever(chunks)
    rag_chain = build_rag_chain(retriever)

    # ทดสอบถาม — แก้ไขหรือเพิ่มคำถามได้ที่นี่
    questions = [
        "ม่านของร้านม่านธารามีจุดเด่นยังไง และบริการเป็นยังไง?",
    ]
    for q in questions:
        ask(rag_chain, q)


if __name__ == "__main__":
    main()
