import Image from "next/image";

const CompaniesSection = () => {
  const companies = [
    { 
      name: "Microsoft", 
      logo: "/images/microsoft.png",
      width: 120,
      height: 40
    },
    { 
      name: "Netflix", 
      logo: "/images/netflix.png",
      width: 120,
      height: 40
    },
    { 
      name: "Flipkart", 
      logo: "/images/flipkart.png",
      width: 120,
      height: 40
    },
    { 
      name: "Swiggy", 
      logo: "/images/swiggy.png",
      width: 120,
      height: 40
    },
  ];

  return (
    <section className="bg-[#11011E] py-16 my-8">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h3 className="text-sm sm:text-lg font-roboto text-[#B6B6B6] mb-6">
          Get hired by top companies worldwide
        </h3>
        <div className="flex flex-wrap justify-center items-center gap-8">
          {companies.map((company, index) => (
            <div 
              key={index} 
              className="relative w-24 sm:w-28 lg:w-32 h-12 flex items-center justify-center transition-transform duration-300 hover:scale-105"
            >
              <Image
                src={company.logo}
                alt={`${company.name} logo`}
                fill
                sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px"
                priority={index < 2}
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CompaniesSection;
