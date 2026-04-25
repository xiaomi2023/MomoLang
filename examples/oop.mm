// MomoLang 面向对象示例
// 对应方案.md 中的 5.1 面向对象

// 定义一个 Animal 类
class Animal {
    function init(name) {
        this.name = name;
    }
    function speak() {
        print(this.name + " makes a sound");
    }
}

// 定义 Dog 类，继承 Animal
class Dog(Animal) {
    function init(name, breed) {
        super.init(name);
        this.breed = breed;
    }
    function speak() {
        print(this.name + " barks");
    }
    function getBreed() {
        return this.breed;
    }
}

// 创建实例
let animal = new Animal("Generic Animal");
animal.speak();

let dog = new Dog("Buddy", "Golden Retriever");
dog.speak();
print("Breed: " + dog.getBreed());

print("Done!");
