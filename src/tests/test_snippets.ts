// This file is for testing snippets

const foo: { test: string } = {
    test: "hello"
}; // correct syntax

const test = () => {
    return {
        method1: () => {
            console.log("method1");
        },
        method2: () => {
            console.log("method2");
        }
    };
};

export {};